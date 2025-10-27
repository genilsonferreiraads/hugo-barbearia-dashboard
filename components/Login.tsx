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
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

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
        // Trigger exit animation
        setIsExiting(true);
        // Wait for animation to finish before navigating
        setTimeout(() => {
          navigate('/dashboard');
        }, 600);
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
    <div className={`relative flex min-h-screen w-full flex-col items-center justify-center bg-cover bg-center bg-no-repeat p-4 login-screen ${isExiting ? 'login-exit' : 'login-enter'}`} style={{ backgroundImage: "url('/imagens/plano-de-fundo-login.png')" }}>
      <div className="absolute inset-0 bg-black/40"></div>
      <main className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="w-full rounded-xl bg-[#1a1a1a]/95 p-8 shadow-2xl border border-white/10">
          <div className="flex flex-col items-center mb-4">
            <div className={`w-14 h-14 mb-3 rounded-full overflow-hidden border-3 border-white/20 shadow-lg ${logoZoom ? 'logo-zoom' : ''}`} style={{ backgroundImage: `url("/imagens/logo-barbearia.JPG")`, backgroundSize: "cover", backgroundPosition: "center" }} onClick={handleLogoClick}></div>
            <h2 className="text-white tracking-light text-center text-[24px] font-bold leading-tight">Acesse o Sistema</h2>
          </div>
          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}
            <label className="flex flex-col w-full">
              <p className="text-white text-base font-medium leading-normal pb-2">Email</p>
              <div className="flex w-full flex-1 items-stretch rounded-lg">
                <input 
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-[#54403b] bg-[#271e1c] p-[15px] pr-2 text-base font-normal leading-normal text-white placeholder:text-[#b9a29d] focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/30 h-14 rounded-r-none border-r-0 transition-all" 
                  placeholder="seu@email.com" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="flex items-center justify-center rounded-r-lg border border-l-0 border-[#54403b] bg-[#271e1c] px-3.5 text-[#b9a29d]">
                  <Icon name="person" />
                </div>
              </div>
            </label>
            <label className="flex flex-col w-full">
              <p className="text-white text-base font-medium leading-normal pb-2">Senha</p>
              <div className="flex w-full flex-1 items-stretch rounded-lg">
                <input 
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-[#54403b] bg-[#271e1c] p-[15px] pr-2 text-base font-normal leading-normal text-white placeholder:text-[#b9a29d] focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/30 h-14 rounded-r-none border-r-0 transition-all" 
                  placeholder="Sua senha" 
                  type={passwordVisible ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex items-center justify-center rounded-r-lg border border-l-0 border-[#54403b] bg-[#271e1c] px-3.5 text-[#b9a29d]">
                  <span className="material-symbols-outlined cursor-pointer hover:text-white transition-colors" onClick={togglePasswordVisibility}>
                    {passwordVisible ? 'visibility' : 'visibility_off'}
                  </span>
                </div>
              </div>
            </label>
            <button 
              className="w-full mt-4 rounded-lg bg-primary py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-dark disabled:opacity-50 disabled:cursor-not-allowed" 
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Entrando...
                </div>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </main>
      <footer className="absolute bottom-5 z-10 text-center w-full">
        <p className="text-xs text-gray-400/80">© 2024 Hugo Barbearia. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};
