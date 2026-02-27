import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { register, login, saveSession } from "@/lib/api";

const signUpSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  companyUrl: z.string().url("Please enter a valid URL (e.g., https://example.com)"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      companyUrl: "",
      password: "",
    },
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSignUp(values: z.infer<typeof signUpSchema>) {
    setIsLoading(true);
    try {
      const result = await register(values);
      
      // Track sign up in GA4
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'sign_up', {
          method: 'email'
        });
      }
      
      // Save basic session info and redirect
      saveSession({
        userId: result.userId,
        email: result.email,
        fullName: values.fullName,
        isPremium: false,
      });
      
      toast({
        title: "Account created!",
        description: `Analyzing ${values.companyUrl}... This may take a minute.`,
      });
      
      setLocation(`/dashboard?userId=${result.userId}`);
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onLogin(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const session = await login(values);
      
      toast({
        title: "Welcome back!",
        description: "Loading your dashboard...",
      });
      
      setLocation(`/dashboard?userId=${session.userId}`);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 font-display font-bold text-2xl text-primary">
            <Zap className="h-8 w-8 fill-current" />
            <span>GTM Champion</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isLoginMode ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground">
            {isLoginMode 
              ? "Sign in to access your dashboard" 
              : "Enter your company details to generate your strategy"
            }
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          key={isLoginMode ? "login" : "signup"}
        >
          <Card className="border-slate-200 shadow-xl">
            <CardHeader>
              <CardTitle>{isLoginMode ? "Sign In" : "Sign Up"}</CardTitle>
              <CardDescription>
                {isLoginMode 
                  ? "Enter your credentials to continue" 
                  : "Start your 14-day free trial. No credit card required."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoginMode ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="jane@company.com" data-testid="input-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" data-testid="input-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full h-11" disabled={isLoading} data-testid="button-login">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                    <FormField
                      control={signUpForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" data-testid="input-fullname" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Email</FormLabel>
                          <FormControl>
                            <Input placeholder="jane@company.com" data-testid="input-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="companyUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://mycompany.com" data-testid="input-companyurl" {...field} />
                          </FormControl>
                          <FormDescription>
                            We'll analyze this URL to personalize your strategy.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" data-testid="input-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full h-11" disabled={isLoading} data-testid="button-signup">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing Website...
                        </>
                      ) : (
                        "Generate Strategy"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t p-6 bg-slate-50/50">
              <p className="text-sm text-muted-foreground">
                {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => setIsLoginMode(!isLoginMode)} 
                  className="text-primary hover:underline font-medium"
                  data-testid="button-toggle-auth"
                >
                  {isLoginMode ? "Sign up" : "Sign in"}
                </button>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
