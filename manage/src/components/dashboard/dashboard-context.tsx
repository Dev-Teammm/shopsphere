"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { CreateCategoryDialog } from "./create-category-dialog";
import { CreateBrandDialog } from "./create-brand-dialog";

interface DashboardContextType {
  isCreateCategoryDialogOpen: boolean;
  setIsCreateCategoryDialogOpen: (open: boolean) => void;
  isCreateBrandDialogOpen: boolean;
  setIsCreateBrandDialogOpen: (open: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] =
    useState(false);
  const [isCreateBrandDialogOpen, setIsCreateBrandDialogOpen] = useState(false);

  return (
    <DashboardContext.Provider
      value={{
        isCreateCategoryDialogOpen,
        setIsCreateCategoryDialogOpen,
        isCreateBrandDialogOpen,
        setIsCreateBrandDialogOpen,
      }}
    >
      {children}

      {/* Global Dialogs */}
      <CreateCategoryDialog
        isOpen={isCreateCategoryDialogOpen}
        onOpenChange={setIsCreateCategoryDialogOpen}
      />
      <CreateBrandDialog
        isOpen={isCreateBrandDialogOpen}
        onOpenChange={setIsCreateBrandDialogOpen}
      />
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
