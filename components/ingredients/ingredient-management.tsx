"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, FlaskConical, Pencil } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost: number;
  stock: number;
  minStock: number;
}

export function IngredientManagement() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);

  const loadIngredients = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ingredients");
      if (res.ok) setIngredients(await res.json());
    } catch (error) {
      console.error("Error loading ingredients:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadIngredients(); }, [loadIngredients]);

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Ingredientes</h1>
        </div>
        {user?.role === "admin" && (
          <Button size="sm" onClick={() => { setEditing(null); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Ingrediente
          </Button>
        )}
      </div>

      <div className="border-b px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar ingrediente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground">Cargando ingredientes...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FlaskConical className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {search ? "No se encontraron ingredientes" : "No hay ingredientes registrados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((ing) => (
              <Card key={ing.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{ing.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Stock: {ing.stock} {ing.unit} · Costo: ${ing.cost}
                    </p>
                  </div>
                  {user?.role === "admin" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(ing); setIsDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <IngredientDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} ingredient={editing} onSaved={() => { loadIngredients(); setIsDialogOpen(false); }} />
    </div>
  );
}

function IngredientDialog({
  open,
  onOpenChange,
  ingredient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: Ingredient | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unit");
  const [cost, setCost] = useState("0");
  const [stock, setStock] = useState("0");

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name);
      setUnit(ingredient.unit);
      setCost(String(ingredient.cost));
      setStock(String(ingredient.stock));
    } else {
      setName("");
      setUnit("unit");
      setCost("0");
      setStock("0");
    }
  }, [ingredient, open]);

  const handleSubmit = async () => {
    const body = { name, unit, cost: parseFloat(cost) || 0, stock: parseFloat(stock) || 0 };
    const url = ingredient ? `/api/ingredients/${ingredient.id}` : "/api/ingredients";
    const method = ingredient ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ingredient ? "Editar Ingrediente" : "Nuevo Ingrediente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Harina" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Unidad</label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, kg, ml, l, u" />
            </div>
            <div>
              <label className="text-sm font-medium">Costo por unidad</label>
              <Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Stock actual</label>
            <Input value={stock} onChange={(e) => setStock(e.target.value)} type="number" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
