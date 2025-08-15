import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifyUserToken } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value ?? "";
  const payload = verifyUserToken(token);
  const isLoggedIn = Boolean(payload);
  
  return (
    <div className="min-h-screen flex items-center justify-center font-good-timing">
      <div className="max-w-md w-full mx-auto p-8">
        {/* Logo J.A.R.V.I.S */}
        <div className="text-center mb-8">
          <h1 className="font-good-timing text-6xl font-bold text-white mb-2 drop-shadow-lg">
            J.A.R.V.I.S
          </h1>
          <p className="text-lg text-white font-medium drop-shadow-md">
            Jarvis Assistant
          </p>
        </div>

        {/* Botões de Ação */}
        <div className=" text-white rounded-lg shadow-xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white font-good-timing">
              {isLoggedIn ? "Bem-vindo de volta!" : "Bem-vindo ao J.A.R.V.I.S"}
            </h2>
          </div>
          
          <div className="flex flex-col gap-4">
            <Link
              className="w-full border-2 border-[#6c91bf] text-white rounded-lg px-4 py-3 font-semibold hover:shadow-[0_0_30px_rgba(96,32,128,1)] transition-all duration-100 font-good-timing text-center"
              							href={isLoggedIn ? "/controle" : "/login"}
            >
              {isLoggedIn ? "Acessar Sistema" : "Fazer Login"}
            </Link>
            
            {!isLoggedIn ? (
              <Link
                className="w-full border-2 border-[#6c91bf] text-white rounded-lg px-4 py-3 font-semibold hover:shadow-[0_0_30px_rgba(96,32,128,1)] transition-all duration-100 font-good-timing text-center"
                href="/register"
              >
                Criar Conta
              </Link>
            ) : (
              <form action="/api/auth/logout" method="POST">
                <button 
                  className="w-full border-2 border-[#6c91bf] text-white rounded-lg px-4 py-3 font-semibold hover:shadow-[0_0_30px_rgba(96,32,128,1)] transition-all duration-100 font-good-timing" 
                  type="submit"
                >
                  Sair do Sistema
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
