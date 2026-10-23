import { getStore } from "@/lib/db";
import StatePicker from "./StatePicker";

export default async function StateIndexPage() {
  const store = await getStore();
  return <StatePicker states={store.states} />;
}