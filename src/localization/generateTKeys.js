/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const input = './locales/fr.json'; // Chemin d'entrée du fichier en.json
const output = './tKeys.ts'; // Chemin de sortie pour tKeys.ts

// Fonction pour transformer l'objet JSON en format tKeys
const transformToTKeys = (obj, parentKey = '') => {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;

    if (typeof value === 'object' && value !== null) {
      // Si la valeur est un objet, on parcourt récursivement
      result[key] = transformToTKeys(value, currentKey);
    } else {
      // Si la valeur est une chaîne (ou autre type), on ajoute la clé dans le format voulu
      result[key] = `'${currentKey}'`; // Encadrer la clé par des guillemets simples
    }
  }

  return result;
};

// Fonction principale pour générer le fichier tKeys.ts
const generateTKeys = () => {
  // Charger le fichier en.json depuis ./src/localization
  const filePath = path.resolve(__dirname, input);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Transformer l'objet JSON en un objet formaté
  const transformedKeys = transformToTKeys(json);

  // Fonction pour générer le code ts à partir de l'objet transformé
  const formatTsObject = (obj, level = 1) => {
    const indentation = '  '.repeat(level); // Créer une indentation dynamique basée sur le niveau

    return Object.entries(obj)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${indentation}${key}: {\n${formatTsObject(value, level + 1)}\n${indentation}},`;
        }
        return `${indentation}${key}: ${value},`; // La clé est déjà formatée
      })
      .join('\n');
  };

  // Créer le contenu du fichier tKeys.ts
  const tsContent = `export const tKeys = {\n${formatTsObject(transformedKeys)}\n} as const;\n`;

  // Sauvegarder le contenu dans le fichier tKeys.ts dans ./src/localization
  const tsFilePath = path.resolve(__dirname, output);
  fs.writeFileSync(tsFilePath, tsContent, 'utf-8');

  console.log('tKeys.ts generated with success !');
};

// Exécuter la génération
generateTKeys();
