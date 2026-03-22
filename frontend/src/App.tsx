import { Input } from "./shared/components/input";
import { Button } from "./shared/components/button";

export function App() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-80 space-y-4">
        <h1 className="text-xl font-bold text-center">Teste UI</h1>

        <Input placeholder="Digite algo..." />

        <Button>Clique aqui para iniciar </Button>
      </div>
    </div>
  );
}