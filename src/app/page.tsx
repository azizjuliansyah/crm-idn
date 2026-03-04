"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Users, Zap, Shield, Globe, MessageSquare, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as any, stiffness: 100 } }
  };

  const features = [
    {
      icon: <Users className="w-6 h-6 text-blue-500" />,
      title: "Manajemen Mandiri",
      description: "Kelola data pelanggan, prospek, dan kontak Anda dalam satu platform yang terpusat dan mudah digunakan."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-purple-500" />,
      title: "Analitik Mendalam",
      description: "Dapatkan wawasan berharga dari data penjualan Anda dengan dashboard interaktif dan laporan kustom."
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      title: "Otomatisasi Cerdas",
      description: "Hemat waktu dengan mengotomatiskan tugas rutin dan alur kerja penjualan Anda."
    },
    {
      icon: <Shield className="w-6 h-6 text-green-500" />,
      title: "Keamanan Terjamin",
      description: "Data Anda dilindungi dengan standar keamanan tingkat tinggi dan enkripsi menyeluruh."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-rose-500" />,
      title: "Komunikasi Lancar",
      description: "Tetap terhubung dengan pelanggan Anda melalui email, SMS, dan obrolan langsung terintegrasi."
    },
    {
      icon: <Globe className="w-6 h-6 text-indigo-500" />,
      title: "Akses Dimana Saja",
      description: "Kelola bisnis Anda dari mana saja dengan tampilan responsif untuk semua perangkat."
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-50 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <Image src="/logo_idn.svg" alt="IDN Logo" width={32} height={32} />
              <span className="font-bold text-xl tracking-tight">CRM Pintar</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:flex items-center gap-8"
            >
              <Link href="#features" className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Fitur</Link>
              <Link href="#testimonials" className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Testimoni</Link>
              {/* <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">Masuk</Link> */}
              <Link href="/login" className="text-sm font-medium px-5 py-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50">Masuk</Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-zinc-50 to-zinc-50 dark:from-blue-900/20 dark:via-zinc-950 dark:to-zinc-950 -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8 border border-blue-100 dark:border-blue-800/50">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></span>
              Pembaruan v2.0 Telah Hadir
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
              Tingkatkan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Penjualan</span> Anda dengan CRM Modern
            </motion.h1>
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Platform CRM pintar yang membantu tim Anda mengelola prospek, melacak peluang, dan membangun hubungan pelanggan yang lebih kuat.
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-xl hover:scale-105 active:scale-95">
                Coba Sekarang <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="#demo" className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-full border-2 border-zinc-200 dark:border-zinc-800 font-semibold hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900">
                Lihat Demo
              </Link>
            </motion.div>
          </motion.div>

          {/* Abstract Graphic / Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, type: "spring" }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20 blur-2xl"></div>
            <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[400px] flex items-center justify-center p-8">
              <div className="w-full h-full border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center text-zinc-400 gap-4 bg-zinc-50/50 dark:bg-black/50 p-12">
                <BarChart3 className="w-16 h-16 text-zinc-300 dark:text-zinc-700" />
                <p className="font-medium text-lg">Gambaran Dashboard Anda di Sini</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Fitur Lengkap untuk Bisnis Anda</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">Segala yang Anda butuhkan untuk mengelola siklus penjualan dari awal hingga akhir dengan mulus dan efisien.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-white dark:hover:bg-zinc-900 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-blue-500/30">
            <motion.div initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <p className="text-4xl md:text-5xl font-bold mb-2">10k+</p>
              <p className="text-blue-200 font-medium">Pengguna Aktif</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <p className="text-4xl md:text-5xl font-bold mb-2">99.9%</p>
              <p className="text-blue-200 font-medium">Uptime Server</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <p className="text-4xl md:text-5xl font-bold mb-2">50+</p>
              <p className="text-blue-200 font-medium">Integrasi Sistem</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
              <p className="text-4xl md:text-5xl font-bold mb-2">24/7</p>
              <p className="text-blue-200 font-medium">Dukungan Tim</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-black text-white dark:bg-zinc-900 rounded-3xl p-10 md:p-16 text-center shadow-2xl border border-zinc-800"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Siap Mengubah Cara Kerja Anda?</h2>
            <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto">Bergabunglah dengan ribuan bisnis lainnya yang telah sukses meningkatkan pendapatan mereka dengan CRM Pintar.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-all">
                Mulai Uji Coba Gratis
              </Link>
              <Link href="/contact" className="w-full sm:w-auto px-8 py-4 rounded-full border border-zinc-700 text-white font-semibold hover:border-zinc-500 transition-all">
                Hubungi Sales
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-sm text-zinc-500 cursor-default">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Tanpa Kartu Kredit</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Batal Kapan Saja</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Akses Penuh 14 Hari</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <Image src="/logo_idn.svg" alt="IDN Logo" width={28} height={28} />
                <span className="font-bold text-xl tracking-tight">CRM Pintar</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                Solusi CRM modern buatan anak bangsa untuk memajukan bisnis di seluruh penjuru Indonesia.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produk</h4>
              <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
                <li><Link href="#features" className="hover:text-blue-600 dark:hover:text-blue-400">Fitur</Link></li>
                <li><Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Harga</Link></li>
                <li><Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Integrasi</Link></li>
                <li><Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Pembaruan</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Perusahaan</h4>
              <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
                <li><Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Tentang Kami</Link></li>
                <li><Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Karir</Link></li>
                <li><Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Blog</Link></li>
                <li><Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Kontak</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
                <li><Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Ketentuan Layanan</Link></li>
                <li><Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Kebijakan Privasi</Link></li>
                <li><Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Kemanan</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500 dark:text-zinc-400 flex items-center justify-between flex-col md:flex-row gap-4">
            <p>&copy; {new Date().getFullYear()} CRM Pintar. Hak Cipta Dilindungi.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-zinc-900 dark:hover:text-white">Twitter</Link>
              <Link href="#" className="hover:text-zinc-900 dark:hover:text-white">LinkedIn</Link>
              <Link href="#" className="hover:text-zinc-900 dark:hover:text-white">Instagram</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
