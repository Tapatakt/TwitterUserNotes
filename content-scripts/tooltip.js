/**
 * Модуль управления всплывающей подсказкой (tooltip).
 *
 * Тултип всегда фиксирован справа экрана (position: fixed).
 * Закрепление (sticky) только по Ctrl.
 */

const Tooltip = (function () {
  'use strict';

  let tooltipEl = null;
  let textareaEl = null;
  let currentUsername = null;
  let isSticky = false;
  let onSaveCallback = null;
  let isSaving = false;
  // DOM-элемент заголовка с ником
  let headerEl = null;

  /**
   * Создаёт DOM-элемент подсказки, если его ещё нет.
   */
  function ensureCreated() {
    if (tooltipEl) {
      return;
    }

    tooltipEl = document.createElement('div');
    tooltipEl.id = 'twitter-user-note-tooltip';

    // Фиксированное позиционирование справа экрана
    Object.assign(tooltipEl.style, {
      position: 'fixed',
      right: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: '999999',
      backgroundColor: '#ffffff',
      border: '1px solid #cccccc',
      borderRadius: '4px',
      padding: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      display: 'none',
      minWidth: '200px',
      maxWidth: '300px'
    });

    // Заголовок с ником пользователя
    headerEl = document.createElement('div');
    headerEl.id = 'twitter-user-note-header';
    Object.assign(headerEl.style, {
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#555555',
      marginBottom: '4px',
      fontFamily: 'sans-serif'
    });

    textareaEl = document.createElement('textarea');
    Object.assign(textareaEl.style, {
      width: '100%',
      minHeight: '60px',
      resize: 'vertical',
      border: 'none',
      outline: 'none',
      fontSize: '13px',
      fontFamily: 'sans-serif',
      background: 'transparent'
    });

    // Enter — сохранить и скрыть
    textareaEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveAndHide();
      }
    });

    // Blur: если закреплён — игнорируем, ждём явного закрытия
    textareaEl.addEventListener('blur', () => {
      if (!tooltipEl || tooltipEl.style.display === 'none') {
        return;
      }
      if (isSticky) {
        return;
      }
      saveAndHide();
    });

    tooltipEl.appendChild(headerEl);
    tooltipEl.appendChild(textareaEl);
    document.body.appendChild(tooltipEl);
  }

  /**
   * Показывает подсказку для указанного пользователя.
   * @param {string} username
   * @param {string} initialText
   */
  function show(username, initialText) {
    ensureCreated();
    currentUsername = username;
    isSticky = false;
    headerEl.textContent = '@' + username;
    textareaEl.value = initialText;
    tooltipEl.style.display = 'block';
  }

  /**
   * Скрывает подсказку.
   */
  function hide() {
    if (!tooltipEl) {
      return;
    }
    tooltipEl.style.display = 'none';
    currentUsername = null;
    isSticky = false;
  }

  /**
   * Сохраняет и скрывает подсказку.
   */
  function saveAndHide() {
    if (!currentUsername || isSaving) {
      return;
    }
    isSaving = true;
    const text = textareaEl.value;
    if (onSaveCallback) {
      onSaveCallback(currentUsername, text);
    }
    isSaving = false;
    hide();
  }

  function getIsSticky() {
    return isSticky;
  }

  function stick() {
    isSticky = true;
  }

  function isMouseOver(event) {
    if (!tooltipEl || tooltipEl.style.display === 'none') {
      return false;
    }
    const rect = tooltipEl.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  function isVisible() {
    return !!tooltipEl && tooltipEl.style.display === 'block';
  }

  function setOnSave(callback) {
    onSaveCallback = callback;
  }

  return {
    show,
    hide,
    saveAndHide,
    getIsSticky,
    stick,
    isMouseOver,
    isVisible,
    setOnSave
  };
})();
