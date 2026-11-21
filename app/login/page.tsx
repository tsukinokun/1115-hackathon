import type { Metadata } from "next";
import { LoginView } from "./_components/LoginView";

export const metadata: Metadata = {
  title: "ログイン | きょうのすき",
  description: "Google でログインして、あなたの冷蔵庫の鍵をつくろう。スキなレシピをストックできます。",
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginView />;
}
