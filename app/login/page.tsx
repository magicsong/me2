"use client"

import { useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">欢迎回来</h1>
          <p className="text-sm text-muted-foreground">
            请登录您的账户继续使用
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error === "CredentialsSignin"
                ? "登录失败，请检查您的邮箱和密码"
                : "登录过程中发生错误"}
            </AlertDescription>
          </Alert>
        )}

        <LoginForm />
        
        <p className="px-8 text-center text-sm text-muted-foreground">
          还没有账户？{" "}
          <a
            href="/register"
            className="underline underline-offset-4 hover:text-primary"
          >
            注册
          </a>
        </p>
      </div>
    </div>
  )
}
