import { redirect } from "next/navigation";

// Les candidatures ne sont plus une section a part : un candidat est un batch
// cooker au premier stade de sa vie. Les liens existants suivent.
export default function CandidaturesRedirect() {
  redirect("/batchcookers?vue=candidatures");
}
