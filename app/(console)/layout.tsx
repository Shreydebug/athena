import { Suspense } from "react";
import { getStore } from "@/lib/db";
import ConsoleShell from "@/components/console/Shell";
import { FiltersProvider } from "@/components/console/Filters";

export default async function ConsoleLayout({ children }: LayoutProps<"/">) {
  const store = await getStore();
  return (
    <Suspense>
      <FiltersProvider>
        <ConsoleShell source={store.source}>{children}</ConsoleShell>
      </FiltersProvider>
    </Suspense>
  );
}