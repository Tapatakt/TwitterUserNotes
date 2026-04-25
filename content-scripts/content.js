/**
 * Точка входа content script.
 * Инициализирует модули и устанавливает связи между ними.
 *
 * Логика связывания:
 * - Tooltip при сохранении вызывает callback → Storage.set.
 * - LinkDetector следит за мышью и Ctrl.
 * - Глобальный обработчик click в фазе захвата закрывает закреплённый тултип,
 *   если клик произошёл за его пределами.
 */

(function () {
  'use strict';

  // Связываем Tooltip с хранилищем
  Tooltip.setOnSave((username, text) => {
    Storage.set(username, text);
  });

  /**
   * Закрывает закреплённый тултип по клику снаружи.
   * Используем capture: true, чтобы точно поймать событие раньше
   * любых stopPropagation со стороны страницы.
   */
  document.addEventListener('click', (e) => {
    // Если тултип не закреплён или не виден — ничего не делаем
    if (!Tooltip.getIsSticky()) {
      return;
    }
    if (!Tooltip.isVisible()) {
      return;
    }

    // Если клик был внутри тултипа — не закрываем
    if (Tooltip.isMouseOver(e)) {
      return;
    }

    // Клик снаружи — сохраняем и закрываем
    Tooltip.saveAndHide();
  }, true);

  // Запускаем отслеживание ссылок
  LinkDetector.init();
})();
