"use client";
import { useEffect, useState, type FormEvent } from "react";

type User = { id: string; name: string; email: string; role: string };
type Product = {
  id: string; category: string; brand: string; name: string; status: string; sizes: string[];
  color: string; hasImage: boolean;
};
type Category = { id: string; label: string; slug: string; productCount?: number };
const tabs = ["Início", "Peças", "Categorias", "Textos do site", "Importar planilha", "Usuários"];

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "A solicitação falhou.");
  return data;
}

function ProductForm({ categories, initial, onSubmit, onCancel }: {
  categories: Category[]; initial?: Product; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel?: () => void;
}) {
  const listId = `category-list-${initial?.id || "new"}`;
  return <form key={initial?.id || "new-product"} className="panel" onSubmit={onSubmit}>
    <h3>{initial ? "Editar peça" : "Cadastrar peça"}</h3>
    {initial && <input type="hidden" name="id" value={initial.id} />}
    <div className="grid">
      <label className="field">Categoria<input name="category" list={listId} required defaultValue={initial?.category || ""} placeholder="Ex.: Tênis"/><datalist id={listId}>{categories.map((category) => <option key={category.id} value={category.label}/>)}</datalist></label>
      <label className="field">Marca<input name="brand" required defaultValue={initial?.brand || ""}/></label>
      <label className="field">Nome da peça<input name="name" required defaultValue={initial?.name || ""}/></label>
      <label className="field">Tamanhos (separados por vírgula)<input name="sizes" defaultValue={initial?.sizes?.join(", ") || ""} placeholder="41, 42, 43"/></label>
      <label className="field">Status<select name="status" defaultValue={initial?.status || "disponivel"}><option value="disponivel">Disponível</option><option value="novo">Novo</option><option value="vendido">Vendido</option><option value="oculto">Oculto</option></select></label>
      <label className="field">Cor de fundo<input name="color" type="color" defaultValue={initial?.color || "#26394d"}/></label>
      <label className="field">Foto (até 5 MB)<input name="photo" type="file" accept="image/*"/></label>
      {initial?.hasImage && <label className="check-field"><input name="removePhoto" type="checkbox"/> Remover foto atual</label>}
    </div>
    <div className="row"><button className="btn">{initial ? "Salvar alterações" : "Salvar peça"}</button>{onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Cancelar</button>}</div>
  </form>;
}

export default function AdminPage() {
  const [setup, setSetup] = useState(false), [user, setUser] = useState<User | null>(null), [tab, setTab] = useState(tabs[0]);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]), [settings, setSettings] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]), [editing, setEditing] = useState<Product | null>(null);

  async function refresh() {
    const status = await api("/api/auth/status");
    setSetup(status.setupRequired); setUser(status.user);
    if (status.user) {
      const [productRows, categoryRows, settingRows] = await Promise.all([
        api("/api/admin/products"), api("/api/admin/categories"), api("/api/admin/settings"),
      ]);
      setProducts(productRows); setCategories(categoryRows); setSettings(settingRows);
      if (status.user.role === "ADMIN") setUsers(await api("/api/admin/users"));
    }
  }
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try { await api(setup ? "/api/auth/setup" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); await refresh(); setMessage("Acesso confirmado."); }
    catch (e) { setError((e as Error).message); }
  }
  async function logout() { await api("/api/auth/logout", { method: "POST" }); setUser(null); }
  async function saveProduct(event: FormEvent<HTMLFormElement>, editingProduct = false) {
    event.preventDefault(); setError(""); setMessage("");
    const element = event.currentTarget;
    const form = new FormData(element);
    try {
      await api("/api/admin/products", { method: editingProduct ? "PUT" : "POST", body: form });
      if (editingProduct) setEditing(null); else element.reset();
      await refresh(); setMessage(editingProduct ? "Peça atualizada." : "Peça cadastrada.");
    } catch (e) { setError((e as Error).message); }
  }
  async function changeStatus(id: string, status: string) {
    try { await api("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); await refresh(); setMessage("Status atualizado."); }
    catch (e) { setError((e as Error).message); }
  }
  async function removeProduct(id: string) {
    if (!confirm("Excluir esta peça do catálogo?")) return;
    try { await api("/api/admin/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); await refresh(); setMessage("Peça excluída."); }
    catch (e) { setError((e as Error).message); }
  }
  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget; const values = new FormData(element);
    try { await api("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: values.get("name") }) }); element.reset(); await refresh(); setMessage("Categoria adicionada."); }
    catch (e) { setError((e as Error).message); }
  }
  async function renameCategory(category: Category) {
    const name = prompt("Novo nome da categoria:", category.label)?.trim();
    if (!name || name === category.label) return;
    try { await api("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: category.id, name }) }); await refresh(); setMessage("Categoria alterada."); }
    catch (e) { setError((e as Error).message); }
  }
  async function removeCategory(category: Category) {
    if (!confirm(`Excluir a categoria “${category.label}”?`)) return;
    try { await api("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: category.id }) }); await refresh(); setMessage("Categoria excluída."); }
    catch (e) { setError((e as Error).message); }
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    try { await api("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(values)) }); await refresh(); setMessage("Textos e links salvos."); }
    catch (e) { setError((e as Error).message); }
  }
  async function importSheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    try { const result = await api("/api/admin/import", { method: "POST", body: values }); await refresh(); setMessage(`Importação concluída: ${result.imported} peças incluídas; ${result.ignored} ignoradas.`); }
    catch (e) { setError((e as Error).message); }
  }
  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget; const values = new FormData(element);
    try { await api("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(values)) }); element.reset(); await refresh(); setMessage("Usuário criado."); }
    catch (e) { setError((e as Error).message); }
  }

  if (!user) return <main className="auth"><form className="panel" onSubmit={submitAuth}><h1>Pievi Club</h1><p className="muted">{setup ? "Primeiro acesso ao painel" : "Entrar no painel administrativo"}</p>{error && <div className="notice error">{error}</div>}{setup && <label className="field">Nome<input name="name" required minLength={2}/></label>}<label className="field">E-mail<input name="email" type="email" required autoComplete="username"/></label><label className="field">Senha<input name="password" type="password" required minLength={setup ? 12 : 1} autoComplete={setup ? "new-password" : "current-password"}/></label><button className="btn">{setup ? "Criar administrador" : "Entrar"}</button></form></main>;

  return <div className="admin-shell"><aside className="sidebar"><h1>Pievi Club</h1><nav>{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setError(""); setMessage(""); }}>{item}</button>)}</nav></aside>
    <main className="main"><div className="topline"><div><h2>{tab}</h2><div className="muted">Olá, {user.name}</div></div><button className="btn secondary" onClick={logout}>Sair</button></div>
      {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
      {tab === "Início" && <section className="grid"><div className="panel"><strong>{products.length}</strong><p className="muted">Peças na curadoria</p></div><div className="panel"><strong>{products.filter((product) => product.hasImage).length}</strong><p className="muted">Peças com imagem</p></div><div className="panel"><strong>{categories.length}</strong><p className="muted">Categorias</p></div><div className="panel"><a href="/site.html" target="_blank">Abrir site público ↗</a></div></section>}

      {tab === "Peças" && <><ProductForm categories={categories} onSubmit={(event) => saveProduct(event)}/>{editing && <ProductForm categories={categories} initial={editing} onSubmit={(event) => saveProduct(event, true)} onCancel={() => setEditing(null)}/>}<section className="panel"><h3>Catálogo ({products.length})</h3><div className="table-wrap"><table className="table"><thead><tr><th>Peça</th><th>Categoria</th><th>Imagem</th><th>Status interno</th><th>Ações</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.brand} — {product.name}</td><td>{product.category}</td><td>{product.hasImage ? "Sim" : "Não"}</td><td><select value={product.status} onChange={(event) => changeStatus(product.id, event.target.value)}><option value="novo">Novo</option><option value="disponivel">Disponível</option><option value="vendido">Vendido</option><option value="oculto">Oculto</option></select></td><td className="row"><button className="btn secondary" onClick={() => { setEditing(product); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button className="btn danger" onClick={() => removeProduct(product.id)}>Excluir</button></td></tr>)}</tbody></table></div></section></>}

      {tab === "Categorias" && <><form className="panel row" onSubmit={addCategory}><label className="field">Nova categoria<input name="name" required placeholder="Ex.: Bonés"/></label><button className="btn">Adicionar</button></form><section className="panel"><h3>Categorias</h3>{categories.map((category) => <div key={category.id} className="category-row"><div><strong>{category.label}</strong><span className="muted">{category.slug}</span></div><div className="row"><button className="btn secondary" onClick={() => renameCategory(category)}>Renomear</button><button className="btn danger" onClick={() => removeCategory(category)}>Excluir</button></div></div>)}</section></>}

      {tab === "Textos do site" && <form key={JSON.stringify(settings)} className="panel" onSubmit={saveSettings}><h3>Conteúdo e links do site</h3><label className="field">Título principal<input name="hero_title" defaultValue={settings.hero_title}/></label><label className="field">Descrição principal<textarea name="hero_description" rows={3} defaultValue={settings.hero_description}/></label><label className="field">Texto de contato<input name="contact_text" defaultValue={settings.contact_text}/></label><label className="field">Link do WhatsApp para solicitar informações<input name="whatsapp_url" type="url" defaultValue={settings.whatsapp_url}/></label><p className="muted">Use o link de atendimento ou do grupo informativo da Pievi. Os botões do catálogo servem para pedir informações, não para concluir compras.</p><label className="field">Link do Instagram<input name="instagram_url" type="url" defaultValue={settings.instagram_url}/></label><button className="btn">Salvar alterações</button></form>}

      {tab === "Importar planilha" && <form className="panel" onSubmit={importSheet}><h3>Importar catálogo existente</h3><p className="muted">Selecione a planilha XLSX do Pievi Club. Os cabeçalhos da aba Catálogo precisam manter os nomes originais.</p><label className="field">Arquivo Excel<input name="file" type="file" accept=".xlsx,.xls,.csv" required/></label><button className="btn">Importar catálogo</button></form>}

      {tab === "Usuários" && (user.role !== "ADMIN" ? <div className="panel">Apenas administradores podem gerenciar usuários.</div> : <><form className="panel" onSubmit={addUser}><h3>Novo usuário</h3><div className="grid"><label className="field">Nome<input name="name" required/></label><label className="field">E-mail<input name="email" type="email" required/></label><label className="field">Senha (mínimo 12 caracteres)<input name="password" type="password" minLength={12} required/></label><label className="field">Perfil<select name="role"><option value="EDITOR">Editor</option><option value="ADMIN">Administrador</option></select></label></div><button className="btn">Criar usuário</button></form><section className="panel"><h3>Usuários</h3>{users.map((item) => <p key={item.id}>{item.name} · {item.email} · {item.role}</p>)}</section></>)}
    </main></div>;
}
