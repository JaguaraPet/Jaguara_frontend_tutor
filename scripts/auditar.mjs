// Auditoria das dependências de produção (RNF01): falha com alerta alto ou crítico, exceto os
// alertas da lista .auditoria-permitida.json, que precisam de motivo e data de revisão.
// Uso: node scripts/auditar.mjs   (o CI roda em todo pull request)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const NIVEIS = new Set(['high', 'critical']);
const hoje = new Date().toISOString().slice(0, 10);

let relatorio;
try {
  relatorio = execSync('npm audit --omit=dev --json', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (erro) {
  // O npm audit sai com código 1 quando acha alertas; o JSON vem mesmo assim.
  relatorio = erro.stdout;
}
const { vulnerabilities = {} } = JSON.parse(relatorio);

const permitidos = JSON.parse(readFileSync(new URL('../.auditoria-permitida.json', import.meta.url), 'utf8'));
const vigentes = new Map(permitidos.filter((p) => p.revisarAte >= hoje).map((p) => [p.id, p]));
const vencidos = permitidos.filter((p) => p.revisarAte < hoje);

// Cada alerta aparece no pacote de origem com o link do GHSA; os demais só herdam o alerta.
const alertas = new Map();
for (const [pacote, v] of Object.entries(vulnerabilities)) {
  for (const via of v.via) {
    if (typeof via !== 'object' || !NIVEIS.has(via.severity)) continue;
    const id = via.url?.split('/').pop() ?? String(via.source);
    alertas.set(id, { id, pacote, titulo: via.title, nivel: via.severity });
  }
}

const bloqueantes = [...alertas.values()].filter((a) => !vigentes.has(a.id));
for (const a of alertas.values()) {
  if (vigentes.has(a.id)) console.log(`permitido  ${a.id} ${a.pacote}: ${vigentes.get(a.id).motivo} (rever até ${vigentes.get(a.id).revisarAte})`);
}
for (const p of vencidos) console.log(`vencido    ${p.id}: a exceção passou de ${p.revisarAte}; reavalie e atualize a lista.`);
for (const a of bloqueantes) console.log(`BLOQUEIA   ${a.id} ${a.pacote} (${a.nivel}): ${a.titulo}`);

if (bloqueantes.length > 0) {
  console.log(`\n${bloqueantes.length} alerta(s) alto(s) ou crítico(s) sem exceção. Atualize a dependência ou registre a exceção com motivo.`);
  process.exit(1);
}
console.log('\nNenhum alerta alto ou crítico sem exceção nas dependências de produção.');
