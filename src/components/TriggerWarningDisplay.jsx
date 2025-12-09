import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Labels et couleurs des trigger warnings
const WARNING_CONFIG = {
  violence: { label: 'Violence', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  graphic_violence: { label: 'Violence graphique', color: 'bg-red-100 text-red-800 border-red-300' },
  sexual_content: { label: 'Contenu sexuel', color: 'bg-pink-100 text-pink-800 border-pink-300' },
  nudity: { label: 'Nudite', color: 'bg-pink-100 text-pink-800 border-pink-300' },
  racism: { label: 'Racisme', color: 'bg-red-100 text-red-800 border-red-300' },
  sexism: { label: 'Sexisme', color: 'bg-red-100 text-red-800 border-red-300' },
  homophobia: { label: 'Homophobie', color: 'bg-red-100 text-red-800 border-red-300' },
  transphobia: { label: 'Transphobie', color: 'bg-red-100 text-red-800 border-red-300' },
  substance_abuse: { label: 'Drogues/Alcool', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  mental_health: { label: 'Sante mentale', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  child_harm: { label: 'Violence sur enfants', color: 'bg-red-100 text-red-800 border-red-300' },
  animal_harm: { label: 'Violence sur animaux', color: 'bg-red-100 text-red-800 border-red-300' },
  body_horror: { label: 'Body horror', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  torture: { label: 'Torture', color: 'bg-red-100 text-red-800 border-red-300' },
  suicide: { label: 'Suicide', color: 'bg-red-100 text-red-800 border-red-300' },
  domestic_abuse: { label: 'Violence domestique', color: 'bg-red-100 text-red-800 border-red-300' }
};

const WARNING_DESCRIPTIONS = {
  violence: 'Scenes de combat, blessures',
  graphic_violence: 'Descriptions detaillees de violence',
  sexual_content: 'References ou scenes sexuelles',
  nudity: 'Descriptions de nudite',
  racism: 'Themes de discrimination raciale',
  sexism: 'Themes de discrimination sexiste',
  homophobia: 'Themes de discrimination LGBT+',
  transphobia: 'Themes de discrimination trans',
  substance_abuse: 'Usage de substances',
  mental_health: 'Themes de maladie mentale',
  child_harm: 'Enfants en danger',
  animal_harm: 'Animaux en danger',
  body_horror: 'Modifications corporelles, mutilations',
  torture: 'Scenes de torture',
  suicide: 'Themes suicidaires',
  domestic_abuse: 'Abus familiaux'
};

/**
 * Composant pour afficher les trigger warnings
 * @param {string[]} warnings - Liste des IDs de warnings
 * @param {boolean} compact - Mode compact (badges seulement)
 * @param {boolean} showIcon - Afficher l'icone d'alerte
 */
const TriggerWarningDisplay = ({ warnings = [], compact = false, showIcon = true }) => {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {showIcon && (
          <AlertTriangle className="w-4 h-4 text-orange-500 mr-1" />
        )}
        {warnings.map(w => {
          const config = WARNING_CONFIG[w];
          if (!config) return null;
          return (
            <span
              key={w}
              className={`px-2 py-0.5 text-xs rounded-full border ${config.color}`}
              title={WARNING_DESCRIPTIONS[w]}
            >
              {config.label}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <span className="font-medium text-orange-800">Trigger Warnings</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {warnings.map(w => {
          const config = WARNING_CONFIG[w];
          if (!config) return null;
          return (
            <div
              key={w}
              className={`px-3 py-1 text-sm rounded-lg border ${config.color}`}
              title={WARNING_DESCRIPTIONS[w]}
            >
              <span className="font-medium">{config.label}</span>
              <span className="text-xs ml-1 opacity-75">- {WARNING_DESCRIPTIONS[w]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Composant pour selectionner les trigger warnings (formulaire)
 */
export const TriggerWarningSelector = ({ selected = [], onChange, availableWarnings = [] }) => {
  const warnings = availableWarnings.length > 0 ? availableWarnings : Object.keys(WARNING_CONFIG);

  const handleToggle = (warningId) => {
    if (selected.includes(warningId)) {
      onChange(selected.filter(w => w !== warningId));
    } else {
      onChange([...selected, warningId]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        <AlertTriangle className="inline w-4 h-4 mr-1 text-orange-500" />
        Trigger Warnings
      </label>
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
        {warnings.map(w => {
          const config = WARNING_CONFIG[w];
          if (!config) return null;
          const isSelected = selected.includes(w);
          return (
            <label
              key={w}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                isSelected ? 'bg-orange-100 border border-orange-300' : 'hover:bg-gray-100'
              }`}
              title={WARNING_DESCRIPTIONS[w]}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(w)}
                className="rounded text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm">{config.label}</span>
            </label>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-500">
          {selected.length} warning{selected.length > 1 ? 's' : ''} selectionne{selected.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default TriggerWarningDisplay;
