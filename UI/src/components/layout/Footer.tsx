import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Globe,
  Heart
} from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Navigation',
      links: [
        { label: 'Accueil', href: '/' },
        { label: 'Recherche', href: '/search' },
        { label: 'Universités', href: '/universities' }
      ]
    },
    {
      title: 'Ressources',
      links: [
        { label: 'Guide d\'utilisation', href: '/guide' },
        { label: 'Formats de citation', href: '/citation' },
        { label: 'FAQ', href: '/faq' }
      ]
    },
    {
      title: 'Institution',
      links: [
        { label: 'À propos', href: '/about' },
        { label: 'Partenaires', href: '/partners' },
        { label: 'Accessibilité', href: '/accessibility' }
      ]
    }
  ];

  const socialLinks = [
    {
      name: 'Facebook',
      href: 'https://facebook.com/theses.ma',
      icon: Facebook,
      color: 'hover:text-blue-600'
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com/theses_ma',
      icon: Twitter,
      color: 'hover:text-blue-400'
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/theses-ma',
      icon: Linkedin,
      color: 'hover:text-blue-700'
    },
    {
      name: 'YouTube',
      href: 'https://youtube.com/@theses-ma',
      icon: Youtube,
      color: 'hover:text-red-600'
    }
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">theses.ma</div>
                <div className="text-xs text-gray-400">Dépôt académique marocain</div>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              La plateforme officielle pour la recherche, la consultation et le partage 
              des thèses académiques des universités marocaines.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Rabat, Maroc</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <a href="mailto:contact@theses.ma" className="hover:text-primary-400 transition-colors duration-200">
                  contact@theses.ma
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>+212 5XX-XXXX-XX</span>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title} className="lg:col-span-1">
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-400 hover:text-primary-400 transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Subscription */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="max-w-md">
            <h3 className="text-white font-semibold mb-4">
              Restez informé
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Recevez les dernières actualités et mises à jour de theses.ma
            </p>
            <form className="flex">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-400"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-r-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                S'abonner
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>© {currentYear} theses.ma. Tous droits réservés.</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <span>Fait avec</span>
                <Heart className="w-4 h-4 text-red-500" />
                <span>au Maroc</span>
              </span>
            </div>

            {/* Language Selector */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Social Links */}
              <div className="flex items-center space-x-3">
                {socialLinks.map((social) => {
                  const IconComponent = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-gray-400 ${social.color} transition-colors duration-200`}
                      title={social.name}
                    >
                      <IconComponent className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Notice */}
      <div className="bg-gray-950 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-gray-500 text-center">
            Cette plateforme respecte les standards d'accessibilité web (WCAG 2.1 AA) et 
            est optimisée pour tous les utilisateurs.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;