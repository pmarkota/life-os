"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Zap,
  Radar,
  DollarSign,
  Dumbbell,
  GraduationCap,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Menu,
  X,
  Terminal,
  UserCog,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Profile, ProfilePermissions } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  hideFromSales?: boolean;
  requiresPermission?: keyof ProfilePermissions;
}

const navItems: NavItem[] = [
  { label: "Command Center", href: "/", icon: LayoutDashboard },
  { label: "Outreach CRM", href: "/crm", icon: Users },
  { label: "Outreach Agent", href: "/outreach", icon: Zap, requiresPermission: "can_generate_messages" },
  { label: "Lead Generator", href: "/leadgen", icon: Radar, requiresPermission: "can_use_leadgen" },
  { label: "Finance", href: "/finance", icon: DollarSign, hideFromSales: true },
  { label: "Fitness", href: "/fitness", icon: Dumbbell, hideFromSales: true },
  { label: "University", href: "/university", icon: GraduationCap, hideFromSales: true },
  { label: "Clients", href: "/clients", icon: Building2, hideFromSales: true },
  { label: "Sales People", href: "/sales-people", icon: UserCog, adminOnly: true },
];

const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 64;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className="group relative flex items-center gap-3 rounded-lg transition-colors duration-150"
      style={{
        padding: collapsed ? "10px 0" : "10px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
      }}
    >
      {/* Active indicator — left edge bar */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="active-indicator"
            className="absolute left-0 top-1/2 h-6 w-[3px] rounded-r-full bg-primary"
            style={{ transform: "translateY(-50%)" }}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
      </AnimatePresence>

      {/* Background hover/active state */}
      {isActive && (
        <motion.div
          layoutId="active-bg"
          className="absolute inset-0 rounded-lg"
          style={{ background: "rgba(14, 165, 233, 0.08)" }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}

      <motion.div
        className="relative z-10 flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
      >
        <Icon
          className={`h-5 w-5 shrink-0 transition-colors duration-150 ${
            isActive
              ? "text-primary"
              : "text-[#71717A] group-hover:text-[#D4D4D8]"
          }`}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`relative z-10 truncate text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "text-[#FAFAFA]"
                : "text-[#A1A1AA] group-hover:text-[#D4D4D8]"
            }`}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Hover overlay */}
      {!isActive && (
        <div className="absolute inset-0 rounded-lg bg-white/[0.03] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<Profile["role"] | null>(null);
  const [permissions, setPermissions] = useState<ProfilePermissions | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Fetch current user's role + permissions once, to decide which nav items to show.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data: Profile = await res.json();
        if (!cancelled) {
          setRole(data.role);
          setPermissions(data.permissions);
        }
      } catch {
        // Silently ignore — restricted items simply won't appear.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const visibleNavItems = navItems.filter((item) => {
    // Wait for role to load before hiding anything; otherwise items flicker on first render.
    if (role === null) return !item.adminOnly;
    if (item.adminOnly && role !== "admin") return false;
    if (item.hideFromSales && role === "sales") return false;
    if (item.requiresPermission && role === "sales") {
      if (!permissions?.[item.requiresPermission]) return false;
    }
    return true;
  });

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo area */}
      <div
        className="flex items-center border-b border-[#27272A]/60 px-4"
        style={{
          height: 64,
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : 12,
        }}
      >
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Terminal className="h-4 w-4 text-primary" />
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md" />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col"
            >
              <span
                className="text-sm font-bold tracking-widest text-[#FAFAFA]"
                style={{
                  textShadow: "0 0 20px rgba(14, 165, 233, 0.3)",
                }}
              >
                PETAR OS
              </span>
              <span className="text-[10px] font-medium tracking-wider text-[#71717A]">
                COMMAND CENTER
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActivePath(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[#27272A]/60 p-3">
        {/* Collapse toggle — hidden on mobile overlay */}
        <div className="mb-2 hidden md:block">
          <motion.button
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[#71717A] transition-colors duration-150 hover:bg-white/[0.03] hover:text-[#A1A1AA]"
            style={{ justifyContent: collapsed ? "center" : "flex-start" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronsLeft className="h-4 w-4 shrink-0" />
            )}
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-medium"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Sign out */}
        <motion.button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[#71717A] transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
          style={{ justifyContent: collapsed ? "center" : "flex-start" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        className="fixed left-0 top-0 z-40 hidden h-screen border-r border-[#27272A]/60 md:block"
        style={{ background: "#141416" }}
        animate={{ width: sidebarWidth }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {sidebarContent}
      </motion.aside>

      {/* Desktop content spacer — pushes main content right */}
      <motion.div
        className="hidden shrink-0 md:block"
        animate={{ width: sidebarWidth }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-[#27272A] bg-[#141416] md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5 text-[#A1A1AA]" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />

            {/* Mobile sidebar panel */}
            <motion.aside
              initial={{ x: -SIDEBAR_EXPANDED }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_EXPANDED }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 z-50 h-screen border-r border-[#27272A]/60 md:hidden"
              style={{
                width: SIDEBAR_EXPANDED,
                background: "#141416",
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-md text-[#71717A] transition-colors hover:bg-white/[0.05] hover:text-[#A1A1AA]"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Reuse sidebar content but force expanded view for mobile */}
              <div className="flex h-full flex-col">
                {/* Logo area */}
                <div className="flex h-16 items-center gap-3 border-b border-[#27272A]/60 px-4">
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Terminal className="h-4 w-4 text-primary" />
                    <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md" />
                  </div>
                  <div className="flex flex-col">
                    <span
                      className="text-sm font-bold tracking-widest text-[#FAFAFA]"
                      style={{
                        textShadow: "0 0 20px rgba(14, 165, 233, 0.3)",
                      }}
                    >
                      PETAR OS
                    </span>
                    <span className="text-[10px] font-medium tracking-wider text-[#71717A]">
                      COMMAND CENTER
                    </span>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4">
                  {visibleNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActivePath(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 ${
                          isActive
                            ? "text-[#FAFAFA]"
                            : "text-[#A1A1AA] hover:text-[#D4D4D8]"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        {isActive && (
                          <div
                            className="absolute inset-0 rounded-lg"
                            style={{
                              background: "rgba(14, 165, 233, 0.08)",
                            }}
                          />
                        )}
                        <Icon
                          className={`relative z-10 h-5 w-5 shrink-0 ${
                            isActive ? "text-primary" : ""
                          }`}
                        />
                        <span className="relative z-10 text-sm font-medium">
                          {item.label}
                        </span>
                        {!isActive && (
                          <div className="absolute inset-0 rounded-lg bg-white/[0.03] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                        )}
                      </Link>
                    );
                  })}
                </nav>

                {/* Bottom */}
                <div className="border-t border-[#27272A]/60 p-3">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[#71717A] transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
