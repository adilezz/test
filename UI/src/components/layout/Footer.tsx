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
        { label: 'Universités', href: '/universities' },
        { label: 'À propos', href: '/about' }
      ]
    },
    {
      title: 'Ressources',
      links: [
        { label: 'Guide d\'utilisation', href: '/guide' },
        { label: 'API Documentation', href: '/api-docs' },
        { label: 'Formats de citation', href: '/citation' },
        { label: 'FAQ', href: '/faq' }
      ]
    },
    {
      title: 'Institution',
      links: [
        { label: 'Équipe', href: '/team' },
        { label: 'Partenaires', href: '/partners' },
        { label: 'Publications', href: '/publications' },
        { label: 'Actualités', href: '/news' }
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
      color: 'hover:text-secondary-400'
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/theses-ma',
      icon: Linkedin,
      color: 'hover:text-accent-400'
    },
    {
      name: 'YouTube',
      href: 'https://youtube.com/@theses-ma',
      icon: Youtube,
      color: 'hover:text-error-400'
    }
  ];

  return (
    <footer className="bg-gradient-to-br from-mountain-900 via-mountain-800 to-neutral-900 text-neutral-300 moroccan-overlay">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-moroccan">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-white">theses.ma</div>
                <div className="text-sm text-primary-300 font-medium">Dépôt académique marocain</div>
              </div>
            </div>
            
            <p className="text-sm text-neutral-300 mb-8 leading-relaxed">
              La plateforme officielle pour la recherche, la consultation et le partage 
              des thèses académiques des universités marocaines.
            </p>

            {/* Contact Info */}
            <div className="space-y-4 text-sm">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <span className="text-neutral-300">Rabat, Maroc</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <a href="mailto:contact@theses.ma" className="text-neutral-300 hover:text-primary-400 transition-colors duration-300 font-medium">
                  contact@theses.ma
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <span className="text-neutral-300">+212 5XX-XXXX-XX</span>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title} className="lg:col-span-1">
              <h3 className="text-white font-serif font-semibold mb-6 text-lg">{section.title}</h3>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-neutral-300 hover:text-primary-400 transition-all duration-300 font-medium hover:translate-x-1 inline-block"
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
        <div className="mt-16 pt-8 border-t border-primary-800">
          <div className="max-w-lg">
            <h3 className="text-white font-serif font-semibold mb-4 text-xl">
              Restez informé
            </h3>
            <p className="text-sm text-neutral-300 mb-6">
              Recevez les dernières actualités et mises à jour de theses.ma
            </p>
            <form className="flex">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="flex-1 px-4 py-3 bg-mountain-800 border border-primary-700 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-neutral-400 transition-all duration-300"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-primary-500 text-white rounded-r-xl hover:bg-primary-600 transition-all duration-300 font-semibold shadow-moroccan hover:shadow-elevated"
              >
                S'abonner
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-3 text-sm text-neutral-400">
              <span>© {currentYear} theses.ma. Tous droits réservés.</span>
              <span>•</span>
              <span className="flex items-center space-x-2">
                <span>Fait avec</span>
                <Heart className="w-4 h-4 text-error-500 animate-pulse" />
                <span>au Maroc</span>
              </span>
            </div>

            {/* Language Selector */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-primary-400" />
                <select className="bg-mountain-800 border border-primary-700 rounded-xl px-4 py-2 text-sm text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300">
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Social Links */}
              <div className="flex items-center space-x-4">
                {socialLinks.map((social) => {
                  const IconComponent = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-neutral-400 ${social.color} transition-all duration-300 hover:scale-110 p-2 rounded-xl hover:bg-primary-800/30`}
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
      <div className="bg-mountain-950 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-neutral-500 text-center font-medium">
            Cette plateforme respecte les standards d'accessibilité web (WCAG 2.1 AA) et 
            est optimisée pour tous les utilisateurs.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;