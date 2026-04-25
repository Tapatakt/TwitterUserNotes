/**
 * Модуль для работы с chrome.storage.local.
 * Предоставляет простой API для чтения/записи комментариев к пользователям.
 * Данные хранятся в виде объекта: { username: "comment text", ... }
 */

const Storage = (function () {
  'use strict';

  // Ключ, под которым в chrome.storage.local лежит весь словарь комментариев
  const STORAGE_KEY = 'twitterUserNotes';

  /**
   * Получает весь объект с комментариями из хранилища.
   * @returns {Promise<Record<string, string>>}
   */
  async function getAll() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || {};
  }

  /**
   * Получает комментарий для конкретного имени пользователя.
   * @param {string} username
   * @returns {Promise<string>}
   */
  async function get(username) {
    const all = await getAll();
    return all[username] || '';
  }

  /**
   * Сохраняет комментарий для пользователя.
   * Если текст пустой (или только пробелы) — удаляет запись из хранилища.
   * @param {string} username
   * @param {string} text
   * @returns {Promise<void>}
   */
  async function set(username, text) {
    const all = await getAll();
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      delete all[username];
    } else {
      all[username] = trimmed;
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: all });
  }

  // Публичный API модуля
  return {
    get,
    set
  };
})();
