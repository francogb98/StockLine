"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, BookOpen, Pencil } from "lucide-react";

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  yield: number;
  yieldUnit: string;
  cost: number;
  ingredients: { id: string; name: string; quantity: number; unit: string }[];
}

export function RecipeManagement() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);

  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) setRecipes(await res.json());
    } catch (error) {
      console.error("Error loading recipes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Recetas</h1>
        </div>
        {user?.role === "admin" && (
          <Button size="sm" onClick={() => { setEditing(null); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Receta
          </Button>
        )}
      </div>

      <div className="border-b px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar receta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground">Cargando recetas...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {search ? "No se encontraron recetas" : "No hay recetas registradas"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((recipe) => (
              <Card key={recipe.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{recipe.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Rendimiento: {recipe.yield} {recipe.yieldUnit} · Costo: ${recipe.cost}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {recipe.ingredients.length} ingredientes
                    </p>
                  </div>
                  {user?.role === "admin" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(recipe); setIsDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RecipeDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} recipe={editing} onSaved={() => { loadRecipes(); setIsDialogOpen(false); }} />
    </div>
  );
}

function RecipeDialog({
  open,
  onOpenChange,
  recipe,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [yieldVal, setYieldVal] = useState("1");
  const [yieldUnit, setYieldUnit] = useState("unit");

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setDescription(recipe.description || "");
      setYieldVal(String(recipe.yield));
      setYieldUnit(recipe.yieldUnit);
    } else {
      setName("");
      setDescription("");
      setYieldVal("1");
      setYieldUnit("unit");
    }
  }, [recipe, open]);

  const handleSubmit = async () => {
    const body = { name, description: description || null, yield: parseFloat(yieldVal) || 1, yieldUnit };
    const url = recipe ? `/api/recipes/${recipe.id}` : "/api/recipes";
    const method = recipe ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{recipe ? "Editar Receta" : "Nueva Receta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pizza Margherita" />
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción opcional" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Rendimiento</label>
              <Input value={yieldVal} onChange={(e) => setYieldVal(e.target.value)} type="number" />
            </div>
            <div>
              <label className="text-sm font-medium">Unidad</label>
              <Input value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)} placeholder="unit, portion, kg" />
            </div>
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
