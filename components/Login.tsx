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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-black p-4 animated-background">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <main className="relative z-10 w-full max-w-4xl">
        <div className={`rounded-3xl bg-gradient-to-b from-[#1f1f1f] to-[#0f0f0f] p-0 shadow-2xl border border-red-500/20 overflow-hidden ${formEnter ? 'form-enter' : ''}`}>
          <div className="flex flex-col lg:flex-row">
            {/* Left side - Logo */}
            <div className="hidden lg:flex w-1/2 items-center justify-center bg-white p-8">
              <div className={`w-80 h-80 overflow-hidden logo-hover ${initialLoad ? 'logo-slide-in' : ''} ${logoZoom ? 'logo-zoom' : ''}`} style={{ backgroundImage: `url("/imagens/logo-barbearia.JPG")`, backgroundSize: "cover", backgroundPosition: "center" }} onClick={handleLogoClick}></div>
            </div>
            
            {/* Right side - Form */}
            <div className="w-full lg:w-1/2 p-8 lg:p-10 flex flex-col justify-center">
              {/* Mobile Logo */}
              <div className="flex lg:hidden flex-col items-center mb-6 relative">
                <div className={`w-14 h-14 mb-3 rounded-full overflow-hidden border-4 border-white/20 shadow-lg ring-2 ring-white/10 logo-hover ${logoZoom ? 'logo-zoom' : ''}`} style={{ backgroundImage: `url("/imagens/logo-barbearia.JPG")`, backgroundSize: "cover", backgroundPosition: "center" }} onClick={handleLogoClick}></div>
                <h2 className="text-white text-center text-2xl font-black leading-tight tracking-tight">Hugo Barbearia</h2>
              </div>
              
              {/* Desktop Title */}
              <div className="hidden lg:flex flex-col items-start mb-8 relative">
                <h2 className="text-white text-start text-3xl font-black leading-tight tracking-tight">Hugo Barbearia</h2>
                <p className="text-white/40 text-sm font-medium mt-1">Painel de Controle</p>
              </div>
              
              <form className="flex flex-col gap-4" onSubmit={handleLogin}>
                {error && (
                  <div className="bg-red-500/15 border border-red-500/50 rounded-xl p-2.5 text-red-300 text-sm flex items-center gap-2 animate-pulse">
                    <span className="material-symbols-outlined text-base">error</span>
                    {error}
                  </div>
                )}
                
                <div className="space-y-2.5">
                  <label className="flex flex-col w-full">
                    <p className="text-white/90 text-xs font-semibold leading-normal pb-1.5 uppercase tracking-wide">Email</p>
                    <div className="flex w-full items-stretch rounded-lg gap-0">
                      <input 
                        className="flex w-full min-w-0 flex-1 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-red-500/30 focus:border-red-500/60 rounded-l-lg px-3.5 py-3 text-sm font-normal text-white placeholder:text-white/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white/10 backdrop-blur-sm rounded-r-none border-r-0" 
                        placeholder="seu@email.com" 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <div className="flex items-center justify-center rounded-r-lg border border-l-0 border-white/10 bg-white/5 px-3 text-white/40 hover:text-red-500/80 transition-colors">
                        <span className="material-symbols-outlined text-base">mail</span>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex flex-col w-full">
                    <p className="text-white/90 text-xs font-semibold leading-normal pb-1.5 uppercase tracking-wide">Senha</p>
                    <div className="flex w-full items-stretch rounded-lg gap-0">
                      <input 
                        className="flex w-full min-w-0 flex-1 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-red-500/30 focus:border-red-500/60 rounded-l-lg px-3.5 py-3 text-sm font-normal text-white placeholder:text-white/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white/10 backdrop-blur-sm rounded-r-none border-r-0" 
                        placeholder="Sua senha" 
                        type={passwordVisible ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="flex items-center justify-center rounded-r-lg border border-l-0 border-white/10 bg-white/5 px-3 text-white/40 hover:text-red-500/80 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">
                          {passwordVisible ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                    </div>
                  </label>
                </div>
                
                <button 
                  className="w-full mt-4 rounded-lg py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 uppercase tracking-wider"
                  style={{ backgroundColor: '#ff0000', boxShadow: '0 0 20px rgba(255, 0, 0, 0.4)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e60000')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff0000')}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      Entrando...
                    </div>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="absolute bottom-5 z-10 w-full text-center">
        <p className="text-xs text-gray-400/80">© 2024 Hugo Barbearia. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};
