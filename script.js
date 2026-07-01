const input = document.getElementById("produto");
const botao = document.getElementById("buscar");
const resultado = document.getElementById("resultado");

botao.addEventListener("click", analisar);

async function analisar() {
    const produto = input.value.trim();

    if (produto === "") {
        alert("Digite um produto ou comparação.");
        return;
    }

    resultado.innerHTML = "<p>🔍 Buscando informações...</p>";

    try {
        const paginas = await buscarNoGoogle(produto);
        const analise = await perguntarGemini(produto, paginas);
        mostrar(analise, paginas);
    } catch (erro) {
        console.error(erro);
        resultado.innerHTML = "<p>❌ Erro ao analisar. Tente novamente.</p>";
    }
}

async function buscarNoGoogle(produto) {
    const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
            "X-API-KEY": "9282fce6839f0771e45a4856e4758fe0e94d32a6",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            q: produto + " preço Brasil comprar agora ou esperar review",
            gl: "br",
            hl: "pt-br",
            num: 20
        })
    });

    const dados = await res.json();

    return (dados.organic || []).map((item, i) => ({
        id: i + 1,
        titulo: item.title,
        resumo: item.snippet,
        link: item.link
    }));
}

async function perguntarGemini(produto, paginas) {

    const prompt = `
O usuário quer saber sobre: ${produto}

Encontramos ${paginas.length} páginas:

${JSON.stringify(paginas, null, 2)}

Leia todos os resultados antes de responder.

Baseando-se apenas nesses textos, responda:

- Vale a pena comprar agora ou esperar?
- Faça uma comparação resumida quando necessário.
- Dê apenas uma faixa aproximada de preço.
- Não invente informações.

Responda apenas em JSON:

{
  "decisao":"Comprar agora / Esperar / Depende",
  "faixaPreco":"",
  "comparacao":"",
  "motivo":"",
  "fontes":[1,2,3]
}
`;

    const CHAVE_API = "AIzaSyD_zLqL1xdpdHBNQr6m8QK0JFzeiQY8soo"; 
    const URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${CHAVE_API}`;

    const res = await fetch(URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
            // generationConfig REMOVIDO DAQUI PARA EVITAR O ERRO 400
        })
    });

    const dados = await res.json();

    if (!res.ok) {
        console.error("Erro detalhado da API do Gemini:", dados);
        throw new Error("Erro na API do Gemini");
    }

    // Trazendo de volta o seu tratamento original para limpar o markdown caso o modelo use
    const texto = dados.candidates[0].content.parts[0].text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    return JSON.parse(texto);
}

function mostrar(analise, paginas) {

    let classe = "depende";

    if (analise.decisao.toLowerCase().includes("comprar")) {
        classe = "comprar";
    } else if (analise.decisao.toLowerCase().includes("esperar")) {
        classe = "esperar";
    }

    let html = "";

    html += `<div class="badge ${classe}">${analise.decisao}</div>`;

    html += `
        <div class="card">
            <h3>💰 Faixa de preço</h3>
            <p>${analise.faixaPreco}</p>
        </div>
    `;

    html += `
        <div class="card">
            <h3>📊 Comparação</h3>
            <p>${analise.comparacao}</p>
        </div>
    `;

    html += `
        <div class="card">
            <h3>🧠 Motivo</h3>
            <p>${analise.motivo}</p>
        </div>
    `;

    html += `
        <div class="info">
            <p><strong>Páginas analisadas:</strong> ${paginas.length}</p>
        </div>
    `;

    html += "<div class='card'>";
    html += "<h3>🌐 Fontes utilizadas</h3>";
    html += "<ul>";

    for (const id of analise.fontes || []) {

        const pagina = paginas.find(p => p.id === id);

        if (pagina) {
            html += `<li><a href="${pagina.link}" target="_blank">${pagina.titulo}</a></li>`;
        }
    }

    html += "</ul>";
    html += "</div>";

    resultado.innerHTML = html;
}
