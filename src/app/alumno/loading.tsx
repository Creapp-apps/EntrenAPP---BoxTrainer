import LoadingScreen from "@/components/ui/loading-screen";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] w-full">
      <LoadingScreen message="Preparando tu entrenamiento..." />
    </div>
  );
}
