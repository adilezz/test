import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Users, BookOpen, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, LanguageCode, UserCreate } from '../../types/api';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    institution: '',
    role: 'student',
    orcid: '',
    acceptTerms: false
  });
  const { register } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      const [firstName, ...lastParts] = formData.name.trim().split(' ');
      const userData: UserCreate = {
        email: formData.email,
        username: formData.email.split('@')[0],
        first_name: firstName || formData.email,
        last_name: lastParts.join(' ') || '',
        title: '',
        language: LanguageCode.FRENCH,
        timezone: 'Africa/Casablanca',
        password: formData.password,
        role: formData.role === 'admin' ? UserRole.ADMIN : UserRole.USER,
        university_id: formData.institution && formData.institution !== 'other' ? formData.institution : undefined
      };
      await register(userData);
    }
  };

  const benefits = [
    {
      icon: BookOpen,
      title: 'Accès complet',
      description: 'Accédez à toutes les thèses et outils de recherche'
    },
    {
      icon: Users,
      title: 'Réseau académique',
      description: 'Connectez-vous avec d\'autres chercheurs'
    },
    {
      icon: Award,
      title: 'Publication',
      description: 'Publiez et partagez vos propres travaux'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Benefits */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Rejoignez la communauté académique marocaine
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Créez votre compte pour accéder à l'ensemble des fonctionnalités 
              et contribuer à l'écosystème de recherche national.
            </p>

            <div className="space-y-6">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side - Registration Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {/* Progress Indicator */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <div className={`w-16 h-0.5 ${step > 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {step === 1 ? 'Créer votre compte' : 'Informations académiques'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="votre.email@universite.ma"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Minimum 8 caractères"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmer le mot de passe *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Retapez votre mot de passe"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Dr. Prénom Nom"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Institution *
                    </label>
                    <select
                      name="institution"
                      value={formData.institution}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez votre institution</option>
                      <option value="Université Mohammed Premier de Oujda">Université Mohammed Premier de Oujda</option>
                      <option value="Université Hassan II de Casablanca">Université Hassan II de Casablanca</option>
                      <option value="Université Mohammed V de Rabat">Université Mohammed V de Rabat</option>
                      <option value="Université Cadi Ayyad de Marrakech">Université Cadi Ayyad de Marrakech</option>
                      <option value="Université Ibn Tofail de Kénitra">Université Ibn Tofail de Kénitra</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Statut *
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="student">Étudiant doctorant</option>
                      <option value="researcher">Chercheur</option>
                      <option value="professor">Professeur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ORCID (optionnel)
                    </label>
                    <input
                      type="text"
                      name="orcid"
                      value={formData.orcid}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0000-0000-0000-0000"
                    />
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                    />
                    <label className="text-sm text-gray-700">
                      J'accepte les{' '}
                      <Link to="/terms" className="text-blue-600 hover:text-blue-800">
                        conditions d'utilisation
                      </Link>{' '}
                      et la{' '}
                      <Link to="/privacy" className="text-blue-600 hover:text-blue-800">
                        politique de confidentialité
                      </Link>
                    </label>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={step === 2 && !formData.acceptTerms}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {step === 1 ? 'Continuer' : 'Créer mon compte'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              Vous avez déjà un compte ?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}