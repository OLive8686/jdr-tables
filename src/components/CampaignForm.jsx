import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TriggerWarningSelector } from './TriggerWarningDisplay';

const CampaignForm = ({ onSubmit, onClose, loading }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system: '',
    trigger_warnings: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      gm: currentUser
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom de la campagne *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: La Malediction de Strahd"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Systeme de jeu
        </label>
        <input
          type="text"
          value={formData.system}
          onChange={(e) => setFormData({ ...formData, system: e.target.value })}
          placeholder="Ex: D&D 5e, Call of Cthulhu, Chroniques Oubliees..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (optionnel)
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Decrivez votre campagne..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
      </div>

      {/* Trigger Warnings */}
      <TriggerWarningSelector
        selected={formData.trigger_warnings}
        onChange={(warnings) => setFormData({ ...formData, trigger_warnings: warnings })}
      />

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Creer'}
        </button>
      </div>
    </form>
  );
};

export default CampaignForm;
