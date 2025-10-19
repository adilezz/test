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

  // Simplified to 3 focused sections per Moroccan rebranding plan
  const footerSections = [
    {
      title: 'Explorer',
      links: [
        { label: 'Rechercher des thèses', href: '/search' },
        { label: 'Universités partenaires', href: '/universities' },
        { label: 'Catégories', href: '/categories' },
        { label: 'Statistiques', href: '/stats' },
        { label: 'Guide d\'utilisation', href: '/guide' }
      ]
    },
    {
      title: 'À propos',
      links: [
        { label: 'Notre mission', href: '/about' },
        { label: 'Partenaires institutionnels', href: '/partners' },
        { label: 'Équipe & Contact', href: '/contact' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Support technique', href: '/support' }
      ]
    },
    {
      title: 'Légal & Accessibilité',
      links: [
        { label: 'Conditions d\'utilisation', href: '/terms' },
        { label: 'Politique de confidentialité', href: '/privacy' },
        { label: 'Accessibilité', href: '/accessibility' },
        { label: 'Formats de citation', href: '/citation' },
        { label: 'API Documentation', href: '/api-docs' }
      ]
    }
  ];

  const socialLinks = [
    {
      name: 'Facebook',
      href: 'https://facebook.com/theses.ma',
      icon: Facebook,
      color: 'hover:text-primary-400'
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com/theses_ma',
      icon: Twitter,
      color: 'hover:text-primary-400'
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/theses-ma',
      icon: Linkedin,
      color: 'hover:text-primary-400'
    },
    {
      name: 'YouTube',
      href: 'https://youtube.com/@theses-ma',
      icon: Youtube,
      color: 'hover:text-secondary-400'
    }
  ];

  return (
    <footer className="bg-navy-900 text-gray-300 border-t-4 border-primary-600">
      {/* Moroccan decorative accent */}
      <div className="h-1 bg-gradient-to-r from-primary-600 via-accent-500 to-secondary-500"></div>
      
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                className="flex-1 px-4 py-2 bg-navy-800 border border-navy-700 rounded-l-moroccan focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-400"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-r-moroccan hover:bg-primary-700 transition-colors duration-200 font-medium shadow-soft hover:shadow-medium"
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

            {/* Language Selector with Moroccan languages */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <select className="bg-navy-800 border border-navy-700 rounded-moroccan px-3 py-1 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                  <option value="ber">ⵜⴰⵎⴰⵣⵉⵖⵜ</option>
                  <option value="es">Español</option>
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

      {/* Accessibility & Moroccan Government Partnership Notice */}
      <div className="bg-navy-950 py-3 border-t border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-4 text-xs text-gray-500">
            <p className="text-center">
              Plateforme conforme aux standards WCAG 2.1 AA pour l'accessibilité
            </p>
            <span className="hidden md:inline">•</span>
            <p className="text-center">
              En partenariat avec le Ministère de l'Enseignement Supérieur du Maroc
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;