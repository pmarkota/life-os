import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="px-6 py-6 md:px-8 md:py-8 lg:px-12 lg:py-10">
            {children}
          </div>
        </main>
      </div>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "#18181B",
            border: "1px solid #27272A",
            color: "#FAFAFA",
          },
        }}
      />
    </TooltipProvider>
  );
}
