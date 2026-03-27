import { useLocation } from "wouter";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { getSession, fetchDashboard } from "@/lib/api";

export default function EmailPreview() {
  const [, setLocation] = useLocation();
  const session = getSession();

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
    enabled: !!session,
  });

  const companyName = data?.company?.name || "Your Company";
  const companyUrl = data?.company?.url || "yourcompany.com";
  const gtmMotion = data?.company?.gtmMotion || "Product-Led Growth";
  const companySummary = data?.company?.summary || "Your company's AI-generated summary will appear here.";
  const userName = data?.user?.fullName?.split(" ")[0] || "there";

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
              Preview of the automated emails sent to you via Postmark.
            </p>
          </div>

          <Tabs defaultValue="welcome" className="max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="welcome" data-testid="tab-welcome-email">Welcome Email</TabsTrigger>
              <TabsTrigger value="weekly" data-testid="tab-weekly-email">Weekly Strategy</TabsTrigger>
            </TabsList>
            
            <TabsContent value="welcome">
               <EmailFrame subject="Welcome to GTM Champion - Your Analysis is Ready">
                 <div className="space-y-6">
                   <h2 className="text-2xl font-bold text-slate-900">Welcome to GTM Champion! 🚀</h2>
                   <p>Hi {userName},</p>
                   <p>Thanks for signing up! We've successfully crawled <strong>{companyUrl}</strong> and our AI has generated your initial Go-To-Market profile.</p>
                   
                   <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 my-6">
                     <h3 className="font-bold text-indigo-900 mb-2">Your GTM Motion: {gtmMotion}</h3>
                     <p className="text-sm text-indigo-800">{companySummary}</p>
                   </div>

                   <p>We've identified high-impact channels for you to focus on this week. Log in to your dashboard to see the full breakdown.</p>
                   
                   <div className="text-center py-4">
                     <Button className="px-8" data-testid="button-view-dashboard">View My Dashboard</Button>
                   </div>
                   
                   <p className="text-sm text-slate-500 mt-8 border-t pt-4">
                     P.S. You can reply directly to this email if you have any questions about your strategy.
                   </p>
                 </div>
               </EmailFrame>
            </TabsContent>

            <TabsContent value="weekly">
              <EmailFrame subject={`Your Weekly GTM Ideas for ${companyName}`}>
                <div className="space-y-6">
                   <h2 className="text-2xl font-bold text-slate-900">Your ideas for this week 💡</h2>
                   <p>Hi {userName},</p>
                   <p>Based on recent trends in your industry, here are 3 actionable GTM ideas for <strong>{companyName}</strong>:</p>
                   
                   <div className="space-y-4 my-6">
                     <div className="p-4 border rounded-lg bg-white">
                       <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">LinkedIn</span>
                       <h4 className="font-bold text-lg mt-1">Case Study: How Client X Grew Revenue 20%</h4>
                       <p className="text-sm text-slate-600 mt-1">Draft a carousel breaking down a recent customer win. Focus on ROI metrics and actionable takeaways.</p>
                     </div>

                     <div className="p-4 border rounded-lg bg-white">
                       <span className="text-xs font-bold text-green-600 uppercase tracking-wide">SEO</span>
                       <h4 className="font-bold text-lg mt-1">Optimize Your Primary Keyword</h4>
                       <p className="text-sm text-slate-600 mt-1">Update your H1 and meta description on the features page to improve organic search visibility.</p>
                     </div>

                     <div className="p-4 border rounded-lg bg-white">
                       <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Content</span>
                       <h4 className="font-bold text-lg mt-1">Write a Comparison Guide</h4>
                       <p className="text-sm text-slate-600 mt-1">Create a detailed comparison with your top 3 competitors. Focus on unique differentiators.</p>
                     </div>
                   </div>

                   <div className="text-center py-4">
                     <Button className="px-8" data-testid="button-execute-ideas">Execute These Ideas</Button>
                   </div>
                 </div>
              </EmailFrame>
            </TabsContent>
          </Tabs>
       </div>
    </div>
  );
}
