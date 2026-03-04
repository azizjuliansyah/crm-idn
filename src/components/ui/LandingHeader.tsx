
import React from 'react';
import { LayoutDashboard, LogIn, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface LandingHeaderProps {
  session: any;
  onNavigate?: (path: string) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ session, onNavigate }) => {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 flex items-center">
      <div className="container mx-auto px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center cursor-pointer" onClick={() => onNavigate && onNavigate('/')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 mr-3">
            <span className="text-white  text-xl tracking-tight">C</span>
          </div>
          <span className="text-xl  tracking-tight text-gray-900">CRM<span className="text-blue-600">IDN</span></span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {['Fitur', 'Solusi', 'Harga', 'Kontak'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm  text-gray-500 hover:text-blue-600 transition-colors uppercase tracking-wide">
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {session ? (
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-gray-900 text-white rounded-xl  text-xs uppercase tracking-tight hover:bg-black transition-all shadow-lg flex items-center gap-2"
            >
              <LayoutDashboard size={16} /> Dashboard
            </Link>
          ) : (
            <>
              {/* <Link
                href="/login"
                className="hidden md:flex px-6 py-3 text-gray-600  text-xs uppercase tracking-tight hover:text-blue-600 transition-colors"
              >
                Masuk
              </Link> */}
              <Link
                href="/login"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl  text-xs uppercase tracking-tight hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
              >
                Masuk <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
