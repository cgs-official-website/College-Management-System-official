import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  Moon,
  Sun,
  ShieldCheck,
  Cloud,
  Headset,
  ChevronRight,
  Zap,
  GraduationCap,
  Users,
  LayoutDashboard,
  CheckCircle2,
  Database,
  BarChart,
  Lock,
  Activity,
  Globe,
  Mail
} from 'lucide-react';

// Floating Card Component for Hero Section
const FloatingCard = ({ icon: Icon, title, delay, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8, ease: "easeOut" }}
    className={`absolute hidden md:flex items-center gap-3 bg-white/10 dark:bg-[#0A0F1C]/50 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl ${className}`}
  >
    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
      <Icon className="w-5 h-5 text-primary-400" />
    </div>
    <div>
      <div className="text-xs text-white/60 font-bold uppercase tracking-wider">{title}</div>
      <div className="w-20 h-2 mt-2 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: delay + 0.5, duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
          className="h-full bg-primary-500"
        />
      </div>
    </div>
  </motion.div>
);

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    if (localStorage.theme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300 overflow-hidden">

      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 dark:bg-[#020813]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/5 py-4' : 'bg-white/50 dark:bg-[#020813]/50 backdrop-blur-sm py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="Zuna" className="w-full h-full object-contain drop-shadow-lg" />
            </div>
            <span className="text-xl font-extrabold tracking-tighter text-slate-900 dark:text-white uppercase">
              Zuna
            </span>
          </div>

          <div className="hidden md:flex items-center gap-10 text-sm font-bold uppercase tracking-wider">
            <a href="#home" className="text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors">Home</a>
            <a href="#about" className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-white transition-colors">About</a>
            <a href="#pricing" className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button onClick={toggleDarkMode} className="text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-white transition-colors">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link to="/login" className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Login <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button onClick={toggleDarkMode} className="text-slate-600 dark:text-slate-300">
              {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
            <button className="text-slate-900 dark:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white/95 dark:bg-[#020813]/95 backdrop-blur-xl pt-24 px-6 md:hidden">
          <div className="flex flex-col gap-6 text-xl font-bold uppercase tracking-wider">
            <a href="#home" className="text-primary-600 dark:text-primary-400" onClick={() => setIsMenuOpen(false)}>Home</a>
            <a href="#about" className="text-slate-900 dark:text-white" onClick={() => setIsMenuOpen(false)}>About</a>
            <a href="#pricing" className="text-slate-900 dark:text-white" onClick={() => setIsMenuOpen(false)}>Pricing</a>
            <Link to="/login" className="text-primary-600 dark:text-primary-400 mt-4" onClick={() => setIsMenuOpen(false)}>Log In / Register</Link>
          </div>
        </div>
      )}

      {/* Ultra-Animated Hero Section */}
      <section id="home" className="pt-24 pb-12 px-4 md:px-6 max-w-[1400px] mx-auto perspective-[2000px]">
        <div className="relative w-full h-[650px] md:h-[800px] rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.15)] bg-[#020813] border border-white/5">

          {/* Animated Background Gradients */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[conic-gradient(from_90deg_at_50%_50%,#020813_0%,#064e3b_50%,#020813_100%)] opacity-30"
          />

          {/* Breathing Orbs */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-500/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen"
          />

          {/* Dynamic Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

          {/* Floating UI Elements */}
          <motion.div
            animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <FloatingCard icon={Activity} title="System Load: 12%" delay={0.5} className="top-32 right-32" />
          </motion.div>

          <motion.div
            animate={{ y: [15, -15, 15], rotate: [2, -2, 2] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <FloatingCard icon={Globe} title="Global Sync" delay={0.8} className="bottom-40 right-20" />
          </motion.div>

          <motion.div
            animate={{ y: [-20, 20, -20] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <FloatingCard icon={ShieldCheck} title="Secured Data" delay={1.1} className="top-64 left-20" />
          </motion.div>

          {/* Hero Content */}
          <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4 sm:px-8 md:px-16 z-20">

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary-500/50 bg-primary-500/10 backdrop-blur-md text-primary-300 text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(16,185,129,0.3)] mb-8"
            >
              <Zap className="w-4 h-4 text-primary-400 animate-pulse" />
              Next-Gen Campus OS
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-6xl md:text-8xl lg:text-[7rem] font-extrabold text-white leading-tight sm:leading-[1.05] mb-6 uppercase tracking-tighter"
            >
              Architect <br className="hidden sm:block" />
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-emerald-400 to-teal-300 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]">Future.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-slate-300 text-lg md:text-xl mb-12 max-w-2xl leading-relaxed"
            >
              The most powerful, beautifully animated, and strictly secured digital environment for educational institutions worldwide.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-6 relative"
            >
              {/* Glowing Button */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-emerald-600 rounded-2xl blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                <Link to="/login" className="relative flex items-center justify-center gap-2 px-10 py-5 bg-[#020813] border border-white/10 group-hover:bg-transparent text-white font-bold uppercase tracking-wider text-sm transition-all rounded-xl">
                  Launch Platform <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <a href="#pricing" className="flex items-center justify-center px-10 py-5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white font-bold uppercase tracking-wider text-sm transition-colors rounded-xl">
                View Pricing
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Middle Green Section */}
      <section className="bg-gradient-to-b from-primary-800 to-primary-950 dark:from-[#064e3b] dark:to-[#022c22] pt-24 pb-48 px-6 relative mt-10 rounded-[3rem] mx-4 md:mx-6 shadow-2xl overflow-hidden border border-white/5">

        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-extrabold text-white uppercase tracking-wide leading-snug mb-20 drop-shadow-xl"
          >
            Pioneering Creative <br />
            Ecosystems
          </motion.h2>

          {/* 3 Vertical Abstract Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto mb-20">
            {[
              {
                title: 'Student Hub',
                desc: 'Digital assignments, live attendance, and real-time grades delivered instantly.',
                icon: GraduationCap,
                bg: 'bg-white/5 border border-white/10'
              },
              {
                title: 'Faculty Portal',
                desc: 'Seamless class management, automated grading, and smart scheduling algorithms.',
                icon: Users,
                bg: 'bg-white/5 border border-white/10'
              },
              {
                title: 'Admin Command',
                desc: 'Complete departmental oversight and full control over all college operations.',
                icon: LayoutDashboard,
                bg: 'bg-white/5 border border-white/10'
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, type: "spring", bounce: 0.4 }}
                className={`h-[400px] md:h-[450px] rounded-[2.5rem] ${item.bg} backdrop-blur-xl p-10 flex flex-col items-center justify-center text-center hover:-translate-y-4 transition-transform duration-500 shadow-2xl group`}
              >
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center mb-8 shadow-inner border border-white/20 group-hover:scale-110 transition-transform duration-500">
                  <item.icon className="w-12 h-12 text-white drop-shadow-md" />
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-4 uppercase tracking-wider">{item.title}</h3>
                <p className="text-white/60 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center"
          >
            <Link to="/login" className="px-12 py-5 bg-white text-primary-900 hover:bg-slate-100 hover:scale-105 font-bold uppercase tracking-wider text-sm transition-all mb-6 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.3)]">
              Initialize System
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Floating Value Props Section */}
      <section className="relative z-20 -mt-24 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Military-Grade Security", icon: ShieldCheck },
            { title: "Cloud Hosted Scalability", icon: Cloud },
            { title: "24/7 Priority Support", icon: Headset }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, type: "spring", bounce: 0.5 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] dark:shadow-none hover:-translate-y-3 transition-transform duration-500 backdrop-blur-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-50 to-emerald-50 dark:from-primary-900/40 dark:to-emerald-900/40 border border-primary-100 dark:border-primary-800 flex items-center justify-center mb-6 shadow-inner">
                <item.icon className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-extrabold text-lg uppercase tracking-wider">{item.title}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom Content Section */}
      <section id="about" className="pt-40 pb-32 px-6 relative max-w-7xl mx-auto">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight leading-[1.1] mb-8 max-w-xl"
          >
            Precision <br />
            Engineered <br />
            Experience
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-600 dark:text-slate-400 max-w-2xl mb-24 text-lg leading-relaxed"
          >
            Our software simplifies everything from attendance tracking to complex grading algorithms. We focus on giving teachers, students, and administrators an intuitive environment to excel in their respective roles without friction.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            {[
              { icon: Database, title: 'Centralized Database', desc: 'Securely store all institutional data in one unified, encrypted location.' },
              { icon: BarChart, title: 'Advanced Analytics', desc: 'Generate actionable insights and automated reports instantly.' },
              { icon: Lock, title: 'Role-Based Access', desc: 'Strict data isolation ensures users only see what they are supposed to.' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2, type: "spring" }}
                className="bg-white dark:bg-[#060D1A] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-10 flex flex-col items-start hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-500 group"
              >
                <div className="w-16 h-16 bg-slate-50 dark:bg-[#0A0F1C] rounded-2xl flex items-center justify-center mb-8 border border-slate-100 dark:border-white/5 group-hover:scale-110 transition-transform duration-500">
                  <item.icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-wide">{item.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section (Updated to user specifications) */}
      <section id="pricing" className="py-32 px-6 bg-slate-50 dark:bg-[#060D1A] relative border-t border-slate-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary-500/30 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 text-xs font-bold tracking-widest uppercase mb-6"
            >
              Simple Pricing
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight mb-6">
              Start Building Today
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Experience the full power of Zuna risk-free. Future expansion plans are currently in development.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Demo Plan - Fully Free */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-primary-700 dark:bg-primary-900 border border-primary-600 dark:border-primary-800 rounded-[2.5rem] p-10 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-primary-900/20 z-10"
            >
              <div className="absolute top-0 right-10 -translate-y-1/2 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-900 text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                Available Now
              </div>
              <h3 className="text-2xl font-extrabold text-white mb-2 uppercase tracking-wider">Demo Plan</h3>
              <p className="text-primary-200 text-sm mb-8 font-medium">30 Days Trial Pack • Fully Free</p>
              <div className="mb-8 flex items-baseline gap-1 text-white">
                <span className="text-6xl font-extrabold">₹0</span>
                <span className="text-primary-300 font-bold">/30 days</span>
              </div>
              <ul className="space-y-5 mb-10 flex-1">
                {['Full System Access', 'Unlimited Students & Staff', 'Complete Analytics Dashboard', 'Priority Onboarding Support', 'No Credit Card Required'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-4 text-sm text-white font-medium">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 drop-shadow-md" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="w-full py-4 rounded-2xl bg-white text-primary-900 font-extrabold uppercase tracking-wider text-sm text-center hover:bg-slate-50 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105">
                Start Free Trial
              </Link>
            </motion.div>

            {/* Pro Plan - Coming Soon */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-10 flex flex-col opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 relative overflow-hidden"
            >
              {/* Coming soon overlay */}
              <div className="absolute inset-0 bg-slate-50/50 dark:bg-[#0A0F1C]/80 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded-full font-extrabold uppercase tracking-widest text-sm shadow-xl transform -rotate-12">
                  Coming Soon
                </div>
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Professional</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">For established institutions.</p>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-6xl font-extrabold text-slate-900 dark:text-white">TBD</span>
              </div>
              <ul className="space-y-5 mb-10 flex-1">
                {['Multi-Campus Support', 'Advanced API Access', 'Custom Domain Integration', 'White-labeling Options'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-4 text-sm text-slate-700 dark:text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-slate-300 dark:text-slate-600 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button disabled className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider text-sm text-center cursor-not-allowed">
                Waitlist
              </button>
            </motion.div>

            {/* Enterprise Plan - Coming Soon */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-10 flex flex-col opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 relative overflow-hidden"
            >
              {/* Coming soon overlay */}
              <div className="absolute inset-0 bg-slate-50/50 dark:bg-[#0A0F1C]/80 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded-full font-extrabold uppercase tracking-widest text-sm shadow-xl transform -rotate-12">
                  Coming Soon
                </div>
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Enterprise</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">For global educational networks.</p>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-6xl font-extrabold text-slate-900 dark:text-white">TBD</span>
              </div>
              <ul className="space-y-5 mb-10 flex-1">
                {['Unlimited Scale', 'On-Premise Deployment', 'Dedicated Success Manager', 'Custom Development'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-4 text-sm text-slate-700 dark:text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-slate-300 dark:text-slate-600 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button disabled className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider text-sm text-center cursor-not-allowed">
                Waitlist
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#020813] border-t border-slate-200 dark:border-white/5 pt-20 pb-10 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 flex items-center justify-center">
                  <img src="/logo.png" alt="Zuna" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <span className="text-xl font-extrabold tracking-tighter text-slate-900 dark:text-white uppercase">
                  Zuna
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                The most powerful, beautifully animated, and strictly secured digital environment for educational institutions worldwide.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  <Globe className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  <Users className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  <Activity className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-slate-900 dark:text-white font-bold uppercase tracking-wider mb-6">Product</h4>
              <ul className="space-y-4">
                <li><a href="#home" className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium">Features</a></li>
                <li><a href="#pricing" className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium">Pricing</a></li>
                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium">Security</a></li>
                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-slate-900 dark:text-white font-bold uppercase tracking-wider mb-6">Resources</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium">Documentation</a></li>
                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium">Help Center</a></li>
                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium">API Reference</a></li>
                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium">Community</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-slate-900 dark:text-white font-bold uppercase tracking-wider mb-6">Contact</h4>
              <ul className="space-y-4">
                <li>
                  <a href="#" className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium">
                    <Mail className="w-4 h-4" /> support@zuna.edu
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-medium">
                    <Globe className="w-4 h-4" /> zuna.ecosystem
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 dark:text-slate-500 text-sm font-medium">
              © {new Date().getFullYear()} Zuna Ecosystem. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm font-medium">
              <a href="#" className="text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
