// Exemplos embutidos (assim a página funciona abrindo o index.html direto, sem servidor).
// Os mesmos grafos existem como arquivos .txt na pasta exemplos/.
const EXAMPLES = {
  enunciado: {
    directed: false,
    weighted: true,
    text: `# Grafo da figura do enunciado
A B 2
A O 2
A D 7
A F 12
B O 5
B C 1
B E 3
B D 4
C O 4
C E 4
D E 4
D T 5
E T 7
F T 3`,
  },
  direcionado: {
    directed: true,
    weighted: true,
    text: `# Direcionado; E isolado; D sem saída
A B 1
B C 2
A C 5
C D 1
E`,
  },
  sempeso: {
    directed: false,
    weighted: false,
    text: `# Sem peso
Centro Norte
Centro Sul
Norte Leste
Sul Leste
Leste Porto`,
  },
};
