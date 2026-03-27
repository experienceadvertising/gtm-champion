import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockCompany } from "@/lib/mock-data";

export default function EmailPreview() {
  const [, setLocation] = useLocation();

  const EmailFrame = ({ subject, children }: { subject: string, children: React.ReactNode }) => (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm max-w-2xl mx-auto my-8">
      <div className="bg-slate-100 px-4 py-3 border-b flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-4 flex-1 bg-white h-6 rounded text-xs flex items-center px-2 text-muted-foreground">
          Subject: <span className="text-slate-900 font-medium ml-1">{subject}</span>
        </div>
      </div>
      <div className="p-8 md:p-12 font-sans text-slate-800">
        {children}
      </div>
    </div>
  );

  return (
    <>
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <div className="min-h-screen bg-slate-50">
       <header className="h-16 border-b bg-white flex items-center px-8 sticky top-0 z-10">
          <Button variant="ghost" size="sm" className="mr-4" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
          <h1 className="font-display font-bold text-lg">Email Automation Preview</h1>
       </header>

       <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold font-display mb-4">Automated Weekly Digests</h2>
            <p className="text-muted-foreground">
              This is a preview of the automated emails your users will receive via Postmark.
            </p>
          </div>

          <Tabs defaultValue="welcome" className="max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="welcome">Welcome Email</TabsTrigger>
              <TabsTrigger value="weekly">Weekly Strategy</TabsTrigger>
            </TabsList>
            
            <TabsContent value="welcome">
               <EmailFrame subject="Welcome to GTM Champion - Your Analysis is Ready">
                 <div className="space-y-6">
                   <h2 className="text-2xl font-bold text-slate-900">Welcome to GTM Champion! 🚀</h2>
                   <p>Hi there,</p>
                   <p>Thanks for signing up! We've successfully crawled <strong>{mockCompany.url}</strong> and our AI has generated your initial Go-To-Market profile.</p>
                   
                   <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 my-6">
                     <h3 className="font-bold text-indigo-900 mb-2">Your GTM Motion: {mockCompany.motion}</h3>
                     <p className="text-sm text-indigo-800">{mockCompany.summary}</p>
                   </div>

                   <p>We've identified 3 high-impact channels for you to focus on this week. Log in to your dashboard to see the full breakdown.</p>
                   
                   <div className="text-center py-4">
                     <Button className="px-8">View My Dashboard</Button>
                   </div>
                   
                   <p className="text-sm text-slate-500 mt-8 border-t pt-4">
                     P.S. You can reply directly to this email if you have any questions about your strategy.
                   </p>
                 </div>
               </EmailFrame>
            </TabsContent>

            <TabsContent value="weekly">
              <EmailFrame subject="Your Weekly GTM Ideas: LinkedIn Carousel & SEO Quick Win">
                <div className="space-y-6">
                   <h2 className="text-2xl font-bold text-slate-900">Here are your ideas for the week 💡</h2>
                   <p>Hi Team,</p>
                   <p>Based on recent trends in your industry, here are 3 actionable GTM ideas for <strong>{mockCompany.name}</strong>:</p>
                   
                   <div className="space-y-4 my-6">
                     <div className="p-4 border rounded-lg bg-white">
                       <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">LinkedIn</span>
                       <h4 className="font-bold text-lg mt-1">Case Study: How Client X saved 20% on fuel</h4>
                       <p className="text-sm text-slate-600 mt-1">Draft a carousel breaking down a recent customer win. Focus on ROI.</p>
                     </div>

                     <div className="p-4 border rounded-lg bg-white">
                       <span className="text-xs font-bold text-green-600 uppercase tracking-wide">SEO</span>
                       <h4 className="font-bold text-lg mt-1">Optimize for "Predictive Logistics"</h4>
                       <p className="text-sm text-slate-600 mt-1">Update your H1 and meta description on the features page.</p>
                     </div>
                   </div>

                   <div className="text-center py-4">
                     <Button className="px-8">Execute These Ideas</Button>
                   </div>
                 </div>
              </EmailFrame>
            </TabsContent>
          </Tabs>
       </div>
    </div>
    </>
  );
}
