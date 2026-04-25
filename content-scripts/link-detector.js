/**
 * Модуль обнаружения ссылок на пользователей Twitter/X.
 *
 * Ключевые изменения:
 * - Ищем ближайшую ссылку ВВЕРХ по дереву через .closest('a'),
 *   потому что в Twitter/X внутри <a> лежат <span>, <img> и т.д.
 * - Парсим URL через new URL() и проверяем pathname,
 *   а не гоняемся за regex на всю строку.
 * - Content script теперь внедряется только на x.com / twitter.com,
 *   поэтому относительные ссылки типа "/UserName" корректно резолвятся.
 */

const LinkDetector = (function () {
  'use strict';

  // Активная ссылка, на которую наведён курсор
  let currentLink = null;
  // Таймер на показ подсказки (0.5 сек)
  let showTimer = null;
  // Таймер на скрытие подсказки (0.5 сек)
  let hideTimer = null;

  // Список зарезервированных имён, которые Twitter/X использует для своих страниц.
  // Эти пути могут выглядеть как /UserName, но на самом деле это не профили.
  const RESERVED_USERNAMES = new Set([
    'home',
    'explore',
    'notifications',
    'tos',
    'privacy'
  ]);

  /**
   * Ищет ближайшую ссылку-родителя для элемента и проверяет,
   * ведёт ли она на профиль пользователя x.com / twitter.com.
   * @param {HTMLElement} element
   * @returns {{element: HTMLAnchorElement, username: string} | null}
   */
  function findUserLink(element) {
    const link = element.closest('a');
    if (!link) {
      return null;
    }

    // Браузер всегда возвращает абсолютный URL в link.href,
    // даже если в разметке было href="/UserName"
    let url;
    try {
      url = new URL(link.href);
    } catch {
      return null;
    }

    // Проверяем хост (учитываем возможные поддомены типа mobile.x.com, хотя маловероятно)
    const host = url.hostname.toLowerCase();
    if (host !== 'x.com' && host !== 'twitter.com') {
      return null;
    }

    // Проверяем pathname: должен быть /UserName или /UserName/
    // Имя пользователя: буквы, цифры, подчёркивание, 1–15 символов
    const match = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/?$/);
    if (!match) {
      return null;
    }

    const username = match[1];

    // Исключаем системные пути (home, explore, notifications и т.д.)
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      return null;
    }

    return {
      element: link,
      username: username
    };
  }

  /**
   * Обработчик движения мыши (фаза захвата, чтобы Twitter не перехватил).
   */
  function handleMouseMove(event) {
    const target = event.target;

    // Если курсор над тултипом — отменяем таймер скрытия
    if (Tooltip.isMouseOver(event)) {
      clearTimeout(hideTimer);
      hideTimer = null;
      return;
    }

    // Если курсор всё ещё над текущей ссылкой (включая вложенные элементы)
    if (currentLink && (target === currentLink || currentLink.contains(target))) {
      return;
    }

    // Ищем профильную ссылку, начиная с элемента под курсором
    const userLink = findUserLink(target);
    if (userLink) {
      enterLink(userLink.element, userLink.username);
      return;
    }

    // Курсор ни над ссылкой-профилем, ни над тултипом
    maybeLeaveLink();
  }

  /**
   * Курсор вошёл на новую ссылку-профиль.
   * @param {HTMLAnchorElement} link
   * @param {string} username — уже извлечённое из URL имя пользователя
   */
  function enterLink(link, username) {
    // Если это та же самая ссылка — отменяем скрытие
    if (currentLink === link) {
      clearTimeout(hideTimer);
      hideTimer = null;
      return;
    }

    // Перешли на другую ссылку — закрываем текущий тултип (с сохранением, если закреплён)
    if (currentLink && currentLink !== link) {
      clearTimers();
      Tooltip.saveAndHide();
    }

    currentLink = link;

    // Запускаем таймер на показ
    clearTimeout(showTimer);
    showTimer = setTimeout(async () => {
      const text = await Storage.get(username);
      // Показываем тултип справа экрана (targetElement больше не нужен для позиции)
      Tooltip.show(username, text);
    }, 500);
  }

  /**
   * Проверяет, нужно ли запускать таймер скрытия.
   */
  function maybeLeaveLink() {
    if (!currentLink) {
      return;
    }

    // Если тултип закреплён (Ctrl) — не скрываем, просто сбрасываем currentLink
    if (Tooltip.getIsSticky()) {
      currentLink = null;
      clearTimeout(hideTimer);
      return;
    }

    // Запускаем таймер скрытия на 0.5 сек
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      Tooltip.hide();
      currentLink = null;
    }, 500);

    // Отменяем таймер показа, если пользователь увёл мышь раньше 0.5 сек
    clearTimeout(showTimer);
    showTimer = null;
  }

  /**
   * Сбрасывает оба активных таймера.
   */
  function clearTimers() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    showTimer = null;
    hideTimer = null;
  }

  /**
   * Закрепляет открытый тултип при нажатии Ctrl.
   */
  function handleKeyDown(e) {
    if (e.key === 'Control' && Tooltip.isVisible()) {
      Tooltip.stick();
    }
  }

  /**
   * Инициализирует отслеживание.
   */
  function init() {
    // capture: true — ловим событие до того, как Twitter вызовет stopPropagation
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('keydown', handleKeyDown);
  }

  // Публичный API
  return {
    init
  };
})();
