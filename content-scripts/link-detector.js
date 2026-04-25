/**
 * Модуль обнаружения пользователей Twitter/X.
 *
 * Гибридная логика:
 * 1. Сначала ищем <span> или <a>, чей textContent (trim) строго равен @UserName.
 *    Это ловит упоминания в тексте твитов и шапки ретвитов.
 * 2. Если текст не подошёл — ищем ближайший <a> и проверяем его href.
 *    Это ловит ссылки на профиль без @ (например, "UserName нравится ваш ответ").
 *
 * В обоих случаях используем .closest(), чтобы наведение на вложенные теги
 * (внутри span или ссылки) тоже срабатывало.
 */

const LinkDetector = (function () {
  'use strict';

  let currentTarget = null;
  let showTimer = null;
  let hideTimer = null;

  // Системные имена Twitter/X
  const RESERVED_USERNAMES = new Set([
    'home',
    'explore',
    'notifications',
    'tos',
    'privacy'
  ]);

  /**
   * Пытается найти упоминание @UserName в тексте элемента.
   * Ищет ближайший <span> или <a> и проверяет его textContent.
   * @param {HTMLElement} element
   * @returns {{element: HTMLElement, username: string} | null}
   */
  function findUserMention(element) {
    const container = element.closest('span, a');
    if (!container) {
      return null;
    }

    const text = container.textContent.trim();
    const match = text.match(/^@([A-Za-z0-9_]{1,15})$/);
    if (!match) {
      return null;
    }

    const username = match[1];
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      return null;
    }

    return {
      element: container,
      username: username
    };
  }

  /**
   * Пытается найти профиль по href ближайшей ссылки.
   * @param {HTMLElement} element
   * @returns {{element: HTMLElement, username: string} | null}
   */
  function findUserLink(element) {
    const link = element.closest('a');
    if (!link) {
      return null;
    }

    let url;
    try {
      url = new URL(link.href);
    } catch {
      return null;
    }

    const host = url.hostname.toLowerCase();
    if (host !== 'x.com' && host !== 'twitter.com') {
      return null;
    }

    const match = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/?$/);
    if (!match) {
      return null;
    }

    const username = match[1];
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      return null;
    }

    return {
      element: link,
      username: username
    };
  }

  /**
   * Обработчик движения мыши (фаза захвата).
   */
  function handleMouseMove(event) {
    const target = event.target;

    // Если курсор над тултипом — отменяем скрытие
    if (Tooltip.isMouseOver(event)) {
      clearTimeout(hideTimer);
      hideTimer = null;
      return;
    }

    // Если курсор всё ещё над текущим целевым элементом (или внутри него)
    if (currentTarget && (target === currentTarget || currentTarget.contains(target))) {
      return;
    }

    // Шаг 1: ищем текстовое упоминание @UserName
    const mention = findUserMention(target);
    if (mention) {
      enterTarget(mention.element, mention.username);
      return;
    }

    // Шаг 2: если текст не подошёл — проверяем ссылку по адресу
    const userLink = findUserLink(target);
    if (userLink) {
      enterTarget(userLink.element, userLink.username);
      return;
    }

    // Курсор ни над упоминанием, ни над ссылкой-профилем, ни над тултипом
    maybeLeaveTarget();
  }

  /**
   * Курсор вошёл на подходящий элемент.
   * @param {HTMLElement} el
   * @param {string} username
   */
  function enterTarget(el, username) {
    if (currentTarget === el) {
      clearTimeout(hideTimer);
      hideTimer = null;
      return;
    }

    if (currentTarget && currentTarget !== el) {
      clearTimers();
      Tooltip.saveAndHide();
    }

    currentTarget = el;

    clearTimeout(showTimer);
    showTimer = setTimeout(async () => {
      const text = await Storage.get(username);
      Tooltip.show(username, text);
    }, 500);
  }

  /**
   * Проверяет, нужно ли запускать таймер скрытия.
   */
  function maybeLeaveTarget() {
    if (!currentTarget) {
      return;
    }

    if (Tooltip.getIsSticky()) {
      currentTarget = null;
      clearTimeout(hideTimer);
      return;
    }

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      Tooltip.hide();
      currentTarget = null;
    }, 500);

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
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('keydown', handleKeyDown);
  }

  return {
    init
  };
})();
