/**
 * Utility function to get the browser language.
 * @returns {string} The language code of the user's browser.
 */
export const getBrowserLanguage = (): string => {
  return navigator.language?.split('-')[0] ?? 'en';
};
