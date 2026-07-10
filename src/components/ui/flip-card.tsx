"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ShinyButton } from "@/components/ui/shiny-button"

export interface FlipCardField {
  name: string
  type?: string
  label: string
  placeholder?: string
}

export interface FlipCardProps {
  frontTitle?: string
  frontDescription?: string
  frontIllustration?: React.ReactNode
  frontContent?: React.ReactNode
  backTitle?: string
  backDescription?: string
  backIllustration?: React.ReactNode
  successTitle?: string
  successDescription?: string
  successIllustration?: React.ReactNode
  fields?: FlipCardField[]
  onLogin?: (data: Record<string, string>) => Promise<boolean> | boolean
  loginButtonText?: string
  backButtonText?: string
  successButtonText?: string
  className?: string
  cardWidth?: string | number
  cardHeight?: string | number
  showBackInitially?: boolean
  // Extended props for EntrenAPP branding integration
  isBranded?: boolean
  primaryColor?: string
  extraFormContent?: React.ReactNode
  successAction?: () => void
}

export default function FlipCard({
  frontTitle = "Welcome Back 👋",
  frontDescription = "Login to continue",
  frontIllustration,
  frontContent,
  backTitle = "Login Form",
  backDescription = "Fill your details",
  backIllustration,
  successTitle = "Login Successful 🎉",
  successDescription = "You are now logged in!",
  successIllustration,
  fields = [
    { name: "email", type: "email", label: "Email", placeholder: "Enter your email" },
    { name: "password", type: "password", label: "Password", placeholder: "Enter your password" },
  ],
  onLogin,
  loginButtonText = "Login",
  backButtonText = "Back",
  successButtonText = "Continue",
  className,
  cardWidth = "100%",
  cardHeight = 520,
  showBackInitially = false,
  isBranded = false,
  primaryColor = "#ea580c",
  extraFormContent,
  successAction,
}: FlipCardProps) {
  const [flipped, setFlipped] = React.useState(showBackInitially)
  const [formData, setFormData] = React.useState<Record<string, string>>({})
  const [success, setSuccess] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      if (onLogin) {
        const result = await onLogin(formData)
        if (result) {
          setSuccess(true)
          setFlipped(false)
        } else {
          setError("Credenciales incorrectas")
        }
      } else {
        setSuccess(true)
        setFlipped(false)
      }
    } catch (err) {
      setError("Fallo al iniciar sesión")
    }
    setLoading(false)
  }

  const handleSuccessClick = () => {
    if (successAction) {
      successAction()
    }
  }

  const cardBgClass = isBranded
    ? "bg-white/[0.02] border-white/[0.08] backdrop-blur-2xl text-white"
    : "bg-white border-slate-200 text-slate-900 shadow-md"

  return (
    <div 
      className={cn("relative", className)} 
      style={{ 
        width: cardWidth, 
        height: cardHeight,
        perspective: "1000px"
      }}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* FRONT SIDE */}
        <Card 
          className={cn(
            "absolute w-full h-full rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center border",
            cardBgClass
          )}
          style={{ 
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden"
          }}
        >
          {!success ? (
            <div className="flex flex-col items-center justify-between w-full h-full">
              <div className="flex-1 flex flex-col items-center justify-center">
                {frontIllustration ?? (
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/20"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                )}
                <h3 className="text-2xl font-black tracking-tight text-center mb-2">{frontTitle}</h3>
                <p className={cn("text-center text-sm mb-4", isBranded ? "text-white/60" : "text-slate-500")}>
                  {frontDescription}
                </p>
                {frontContent}
              </div>
              
              {isBranded ? (
                <ShinyButton
                  onClick={() => setFlipped(true)}
                  primaryColor={primaryColor}
                  className="w-full py-6 rounded-2xl font-black text-white flex items-center justify-center gap-2 mt-4"
                >
                  {loginButtonText}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </ShinyButton>
              ) : (
                <Button 
                  className="w-full py-6 rounded-2xl font-black text-white hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 mt-4" 
                  onClick={() => setFlipped(true)}
                  style={{ backgroundColor: primaryColor }}
                >
                  {loginButtonText}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between w-full h-full">
              <div className="flex-1 flex flex-col items-center justify-center">
                {successIllustration ?? (
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <h3 className="text-2xl font-black tracking-tight text-center mb-2">{successTitle}</h3>
                <p className={cn("text-center text-sm", isBranded ? "text-white/60" : "text-slate-500")}>
                  {successDescription}
                </p>
              </div>
              <Button 
                className="w-full py-6 rounded-2xl font-black text-white"
                style={{ backgroundColor: primaryColor }}
                onClick={handleSuccessClick}
              >
                {successButtonText}
              </Button>
            </div>
          )}
        </Card>

        {/* BACK SIDE */}
        <Card
          className={cn(
            "absolute w-full h-full rounded-3xl p-6 sm:p-8 flex flex-col justify-between border",
            cardBgClass
          )}
          style={{ 
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden"
          }}
        >
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                {backIllustration}
                <div>
                  <h3 className="text-xl font-black tracking-tight">{backTitle}</h3>
                  <p className={cn("text-xs font-semibold", isBranded ? "text-white/40" : "text-slate-400")}>
                    {backDescription}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {fields.map((field) => (
                  <div key={field.name} className="flex flex-col gap-1.5 relative">
                    <label className={cn("text-xs font-bold uppercase tracking-wider", isBranded ? "text-white/50" : "text-slate-500")}>
                      {field.label}
                    </label>
                    <div className="relative w-full">
                      <Input
                        name={field.name}
                        type={field.type === "password" ? (showPassword ? "text" : "password") : (field.type || "text")}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ""}
                        onChange={handleChange}
                        required
                        className={cn(
                          "py-5 px-4 pr-12 rounded-xl border transition-all text-sm outline-none w-full",
                          isBranded 
                            ? "bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 focus-visible:border-white/30 focus-visible:ring-white/10" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus-visible:border-primary/50"
                        )}
                      />
                      {field.type === "password" && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={cn(
                            "absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none transition hover:opacity-80 p-1 rounded-md",
                            isBranded ? "text-white/40 hover:text-white/70" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {error && (
                  <p className="text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg text-center animate-shake">
                    {error}
                  </p>
                )}
                
                <div className="flex flex-col gap-2 pt-2">
                  {isBranded ? (
                    <ShinyButton
                      type="submit"
                      disabled={loading}
                      primaryColor={primaryColor}
                      className="w-full py-5 rounded-xl shadow-lg font-black text-white"
                    >
                      {loading ? "Ingresando..." : loginButtonText}
                    </ShinyButton>
                  ) : (
                    <Button 
                      type="submit" 
                      className="w-full py-5 rounded-xl font-black text-white shadow-lg" 
                      disabled={loading}
                      style={{ backgroundColor: primaryColor }}
                    >
                      {loading ? "Ingresando..." : loginButtonText}
                    </Button>
                  )}
                  
                  <button 
                    type="button" 
                    className={cn(
                      "w-full py-2.5 rounded-xl text-xs font-bold transition-all border",
                      isBranded
                        ? "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-white"
                        : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                    )}
                    onClick={() => setFlipped(false)}
                  >
                    {backButtonText}
                  </button>
                </div>
              </form>
            </div>

            {/* Extra footer elements (Google, Sign Up link, etc.) */}
            {extraFormContent && (
              <div className="mt-4">
                {extraFormContent}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
