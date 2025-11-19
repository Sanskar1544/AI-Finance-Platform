import { getUserAccounts } from "@/actions/dashboard";
import { defaultCategories } from "@/data/categories";
import { AddTransactionForm } from "../_components/transaction-form";
import { getTransaction } from "@/actions/transaction";

export default async function AddTransactionPage(props) {

  const searchParams = await props.searchParams;
  const editId = searchParams?.edit ?? null;

  const accounts = await getUserAccounts();

  let initialData = null;
  if (editId) {
    try {
      initialData = await getTransaction(editId);
    } catch (err) {
      console.error("Error fetching transaction:", err);
      initialData = null;
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-6">
      <div className="flex justify-center md:justify-start mb-8">
        <h1 className="text-4xl md:text-5xl gradient-title font-bold">
          {editId ? "Edit Transaction" : "Add Transaction"}
        </h1>
      </div>

      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        editMode={!!editId}
        initialData={initialData}
      />
    </div>
  );
}
