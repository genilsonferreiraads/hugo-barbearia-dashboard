import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts.tsx';

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined">{name}</span>;

export const LoginPage: React.FC = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoZoom, setLogoZoom] = useState(false);
  const [formEnter, setFormEnter] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  React.useEffect(() => {
    setFormEnter(true);
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogoClick = () => {
    setLogoZoom(true);
    setTimeout(() => setLogoZoom(false), 600);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError('Email ou senha incorretos');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setPasswordVisible(prev => !prev);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-4">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/20 rounded-full mix-blend-screen filter blur-3xl animate-float-orb-1"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-red-600/15 rounded-full mix-blend-screen filter blur-3xl animate-float-orb-2"></div>
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-primary/10 rounded-full mix-blend-screen filter blur-3xl animate-float-orb-3"></div>
      </div>
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
      
      <main className="relative z-10 w-full max-w-4xl">
        <div className={`backdrop-blur-xl rounded-2xl bg-gradient-to-br from-zinc-900/90 via-black/95 to-zinc-950/90 p-0 shadow-2xl border border-red-500/20 overflow-hidden transition-all duration-700 ${formEnter ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex flex-col lg:flex-row">
            {/* Left side - Logo & Branding */}
            <div className="hidden lg:flex w-2/5 flex-col items-center justify-center bg-gradient-to-br from-white via-gray-50 to-gray-100 p-8 relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-8 left-8 w-24 h-24 border-2 border-primary rounded-full"></div>
                <div className="absolute bottom-12 right-8 w-16 h-16 border-2 border-primary/50 rounded-full"></div>
                <div className="absolute top-1/2 left-12 w-12 h-12 bg-primary/20 rounded-lg rotate-45"></div>
              </div>
              
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div 
                  className={`w-48 h-48 overflow-hidden rounded-2xl shadow-xl transition-transform duration-500 cursor-pointer hover:scale-105 ${initialLoad ? 'animate-logo-slide-in' : ''} ${logoZoom ? 'scale-110' : ''}`} 
                  style={{ 
                    backgroundImage: `url("/imagens/logo-barbearia.JPG")`, 
                    backgroundSize: "cover", 
                    backgroundPosition: "center",
                    boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)"
                  }} 
                  onClick={handleLogoClick}
                ></div>
                
                <div className="text-center">
                  <h1 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">Hugo Barbearia</h1>
                  <p className="text-gray-600 font-medium text-sm">Sistema de Gestão</p>
                </div>
                
                <div className="flex flex-col gap-2 mt-2 text-gray-600">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-primary text-base">content_cut</span>
                    <span className="font-semibold">Serviços</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-primary text-base">calendar_month</span>
                    <span className="font-semibold">Agendamentos</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-primary text-base">payments</span>
                    <span className="font-semibold">Financeiro</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="w-full lg:w-3/5 p-6 lg:p-8 flex flex-col justify-center relative">
              {/* Mobile Logo */}
              <div className="flex lg:hidden flex-col items-center mb-6 relative">
                <div 
                  className={`w-16 h-16 mb-3 rounded-xl overflow-hidden border-3 border-primary/20 shadow-xl transition-transform duration-300 cursor-pointer hover:scale-105 ${logoZoom ? 'scale-110' : ''}`} 
                  style={{ 
                    backgroundImage: `url("/imagens/logo-barbearia.JPG")`, 
                    backgroundSize: "cover", 
                    backgroundPosition: "center"
                  }} 
                  onClick={handleLogoClick}
                ></div>
                <h2 className="text-white text-center text-2xl font-black leading-tight tracking-tight">Hugo Barbearia</h2>
                <p className="text-white/50 text-xs font-medium mt-1">Painel de Controle</p>
              </div>
              
              {/* Desktop Title */}
              <div className="hidden lg:flex flex-col items-start mb-6 relative">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-10 bg-gradient-to-b from-primary to-red-700 rounded-full"></div>
                  <div>
                    <h2 className="text-white text-2xl font-black leading-tight tracking-tight">Bem-vindo</h2>
                    <p className="text-white/50 text-xs font-medium">Entre na sua conta</p>
                  </div>
                </div>
              </div>
              
              <form className="flex flex-col gap-4" onSubmit={handleLogin}>
                {error && (
                  <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/40 rounded-lg p-2.5 text-red-300 text-xs flex items-center gap-2 shadow-lg shadow-red-500/10 animate-pulse">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span className="font-medium">{error}</span>
                  </div>
                )}
                
                <div className="space-y-3">
                  <label className="flex flex-col w-full">
                    <p className="text-white/90 text-[10px] font-bold leading-normal pb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-primary">mail</span>
                      Email
                    </p>
                    <div className="flex w-full items-stretch rounded-lg gap-0 shadow-md shadow-black/20">
                      <input 
                        className="flex w-full min-w-0 flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/40 focus:border-primary/80 rounded-l-lg px-3 py-2.5 text-sm font-medium text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white/10 backdrop-blur-sm rounded-r-none border-r-0" 
                        placeholder="seu@email.com" 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <div className="flex items-center justify-center rounded-r-lg border border-l-0 border-white/10 bg-white/5 px-3 text-white/30">
                        <span className="material-symbols-outlined text-base">alternate_email</span>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex flex-col w-full">
                    <p className="text-white/90 text-[10px] font-bold leading-normal pb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-primary">lock</span>
                      Senha
                    </p>
                    <div className="flex w-full items-stretch rounded-lg gap-0 shadow-md shadow-black/20">
                      <input 
                        className="flex w-full min-w-0 flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/40 focus:border-primary/80 rounded-l-lg px-3 py-2.5 text-sm font-medium text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white/10 backdrop-blur-sm rounded-r-none border-r-0" 
                        placeholder="Sua senha" 
                        type={passwordVisible ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="flex items-center justify-center rounded-r-lg border border-l-0 border-white/10 bg-white/5 px-3 text-white/30 hover:text-primary hover:bg-white/10 transition-all duration-300 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">
                          {passwordVisible ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                    </div>
                  </label>
                </div>
                
                <button 
                  className="relative w-full mt-4 rounded-lg py-3 text-sm font-black text-white shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] uppercase tracking-wider overflow-hidden group"
                  style={{ backgroundColor: '#ff0000', boxShadow: '0 8px 30px rgba(255, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e60000')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff0000')}
                  type="submit"
                  disabled={loading}
                >
                  <span className="absolute inset-0 w-0 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:w-full transition-all duration-700 ease-out"></span>
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      <span>Entrando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      <span>Entrar no Sistema</span>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </div>
                  )}
                </button>
              </form>
              
              {/* Additional Info */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="flex items-center justify-center gap-1.5 text-white/40 text-[10px]">
                  <span className="material-symbols-outlined text-xs">shield</span>
                  <span className="font-medium">Ambiente seguro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="absolute bottom-6 z-10 w-full text-center">
        <p className="text-xs text-gray-500 font-medium backdrop-blur-sm bg-black/20 inline-block px-4 py-2 rounded-full">
          © 2024 Hugo Barbearia • Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
};
