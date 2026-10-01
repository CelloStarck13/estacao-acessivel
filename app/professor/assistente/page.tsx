"use client";

import { useRouter } from "next/navigation";
import AssistantModal from "../painel/assistant-modal";

export default function AssistenteDudaPage(){
  const router=useRouter();
  return <AssistantModal onClose={()=>router.push("/professor/painel")} />;
}
