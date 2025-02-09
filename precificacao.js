/* ==== INÍCIO SEÇÃO - VARIÁVEIS GLOBAIS ==== */
let materiais = [];
let maoDeObra = { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 }; // Horas padrão 220h
let custosIndiretosPredefinidosBase = [ // This is the base template, never modified
    { descricao: "Energia elétrica", valorMensal: 0 },
    { descricao: "Água", valorMensal: 0 },
    { descricao: "Gás", valorMensal: 0 },
    { descricao: "Aluguel do espaço", valorMensal: 0 },
    { descricao: "Depreciação de máquinas e equipamentos", valorMensal: 0 },
    { descricao: "Manutenção predial e de equipamentos", valorMensal: 0 },
    { descricao: "Despesas com segurança", valorMensal: 0 },
    { descricao: "Limpeza e conservação", valorMensal: 0 },
    { descricao: "Material de escritório", valorMensal: 0 },
    { descricao: "Impostos e taxas indiretos", valorMensal: 0 },
    { descricao: "Marketing institucional", valorMensal: 0 },
    { descricao: "Transporte e logística", valorMensal: 0 },
    { descricao: "Despesas com utilidades", valorMensal: 0 },
    { descricao: "Demais custos administrativos", valorMensal: 0 }
];
let custosIndiretosPredefinidos = JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase)); // Working copy, modified by user inputs
let custosIndiretosAdicionais = [];
let produtos = [];
let modoEdicaoMaoDeObra = false;
let itemEdicaoCustoIndireto = null;
let novoCustoIndiretoCounter = 0; // Contador para IDs únicos de custos indiretos adicionais
let taxaCredito = {percentual: 5, incluir: false}; //Objeto para taxa de crédito.  INICIALIZA COM 5%
let margemLucroPadrao = 50; // Margem de lucro padrão.
/* ==== FIM SEÇÃO - VARIÁVEIS GLOBAIS ==== */

/* ==== INÍCIO SEÇÃO - FUNÇÃO DE BACKUP AUTOMÁTICO ==== */
function backupAutomatico() {
    const dadosParaExportar = JSON.stringify({
        materiais,
        maoDeObra,
        custosIndiretosPredefinidos,
        custosIndiretosAdicionais,
        produtos,
        taxaCredito,
        margemLucroPadrao
    });
    const blob = new Blob([dadosParaExportar], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
    const dia = agora.getDate().toString().padStart(2, '0');
    const hora = agora.getHours().toString().padStart(2, '0');
    const minuto = agora.getMinutes().toString().padStart(2, '0');
    const nomeArquivo = `${ano}${mes}${dia}_${hora}${minuto}_Backup_Precificacao_Pérola_Rara.json`;

    //  AGORA ATUALIZA O localStorage do último backup:
    localStorage.setItem('ultimoBackup', JSON.stringify({ nomeArquivo, data: agora.toISOString() })); //  <--  ADICIONADO

    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    atualizarPainelUltimoBackup();  //  <--  ADICIONADO (agora atualiza o painel)
}
/* ==== FIM SEÇÃO - FUNÇÃO DE BACKUP AUTOMÁTICO ==== */

/* ==== INÍCIO SEÇÃO - FUNÇÕES AUXILIARES ==== */
/* Formatação de valores em moeda */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* Exibir a subpágina desejada */
function mostrarSubMenu(submenuId) {
    const conteudos = ['materiais-insumos', 'mao-de-obra', 'custos-indiretos', 'produtos-cadastrados', 'calculo-precificacao', 'importar-exportar']; // Adicionado importar-exportar
    conteudos.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.style.display = 'none';
        }
    });
    const submenu = document.getElementById(submenuId);
    if (submenu) {
        submenu.style.display = 'block';
    }
}

/* Limpar formulário */
function limparFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}
/* ==== FIM SEÇÃO - FUNÇÕES AUXILIARES ==== */

/* ==== INÍCIO SEÇÃO - EVENT LISTENERS GLOBAIS ==== */
/* Monitorar os radios para exibir os campos corretos */
document.addEventListener('DOMContentLoaded', () => { //  <--  AGORA É GLOBAL
    document.querySelectorAll('input[name="tipo-material"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const camposComprimento = document.getElementById('campos-comprimento');
            const camposLitro = document.getElementById('campos-litro');
            const camposQuilo = document.getElementById('campos-quilo');
            const camposArea = document.getElementById('campos-area');

            camposComprimento.style.display = 'none';
            camposLitro.style.display = 'none';
            camposQuilo.style.display = 'none';
            camposArea.style.display = 'none';

            if (this.value === "comprimento") {
                camposComprimento.style.display = "block";
            } else if (this.value === "litro") {
                camposLitro.style.display = "block";
            } else if (this.value === "quilo") {
                camposQuilo.style.display = "block";
            } else if (this.value === "area") {
                camposArea.style.display = "block";
            }
        });
    });

    // --- CARREGAR DADOS (NO DOMContentLoaded GLOBAL) ---
    carregarDados();
    carregarCustosIndiretosPredefinidos(); //  <-- Importante!
    atualizarTabelaMateriaisInsumos();     //  <-- Importante!
    atualizarTabelaCustosIndiretos();    //  <-- Importante!
    atualizarTabelaProdutosCadastrados(); //  <-- Importante!
    atualizarPainelUltimoBackup();      // <-- Importante!

    //Inicializar com a seção de cálculo.  (NO DOMContentLoaded GLOBAL)
    mostrarSubMenu('calculo-precificacao');

      // --- INICIALIZAÇÃO DA MARGEM DE LUCRO E TAXA DE CRÉDITO ---  (NO DOMContentLoaded GLOBAL)
      document.getElementById('margem-lucro-final').value = margemLucroPadrao;
      document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;

      // --- INICIALIZA O ESTADO DOS RADIOS DA TAXA --- (NO DOMContentLoaded GLOBAL)
      if (taxaCredito.incluir) {
          document.getElementById('incluir-taxa-credito-sim').checked = true;
      } else {
          document.getElementById('incluir-taxa-credito-nao').checked = true;
      }

      // --- Dispara os eventos para calcular inicialmente --- (NO DOMContentLoaded GLOBAL)
      calcularCustos(); // Garante que tudo seja calculado no início
      salvarTaxaCredito();  //Para atualizar mensagem e valores corretamente.

    //Para esconder o autocomplete quando clica fora.  (NO DOMContentLoaded GLOBAL)
    document.addEventListener('click', function(event) {
        const autocompleteDiv = document.getElementById('produto-resultados');
        const inputPesquisa = document.getElementById('produto-pesquisa');

        if (event.target !== autocompleteDiv && event.target !== inputPesquisa) {
            autocompleteDiv.classList.add('hidden');
        }
    });
});
/* ==== FIM SEÇÃO - EVENT LISTENERS GLOBAIS ==== */

/* ==== INÍCIO SEÇÃO - CÁLCULO DO CUSTO UNITÁRIO ==== */
/* Função para calcular o custo unitário com base nas fórmulas */
function calcularCustoUnitario(tipo, valorTotal, comprimentoCm, volumeMl, pesoG, larguraCm, alturaCm) {
    let custoUnitario = 0;
    switch (tipo) {
        case "comprimento":
            custoUnitario = valorTotal / (comprimentoCm / 100);  // Divide por 100 para converter cm para m
            break;
        case "litro":
            custoUnitario = valorTotal / (volumeMl / 1000); // Divide por 1000 para converter ml para L
            break;
        case "quilo":
            custoUnitario = valorTotal / (pesoG / 1000);  // Divide por 1000 para converter g para kg
            break;
        case "unidade":
            custoUnitario = valorTotal;
            break;
        case "area":
            // A área já é calculada em m² em cadastrarMaterialInsumo
            custoUnitario = valorTotal / ((larguraCm/100) * (alturaCm/100)); // Divide o valor total pela área em m²
            break;
    }
    return custoUnitario;
}
/* ==== FIM SEÇÃO - CÁLCULO DO CUSTO UNITÁRIO ==== */

/* ==== INÍCIO SEÇÃO - CADASTRO DE MATERIAL/INSUMO ==== */
/* Cadastrar Material/Insumo */
function cadastrarMaterialInsumo() {
    const nome = document.getElementById('nome-material').value.trim();
    const valorTotal = parseFloat(document.getElementById('valor-total-material').value);
    const tipo = document.querySelector('input[name="tipo-material"]:checked').value;
    let comprimentoCm = 0, volumeMl = 0, pesoG = 0, larguraCm = 0, alturaCm = 0;

    // --- Validação de entrada ---
    if (!nome) {
        alert("Por favor, insira um nome para o material.");
        return;
    }
    if (isNaN(valorTotal) || valorTotal <= 0) {
        alert("Por favor, insira um valor total válido (maior que zero).");
        return;
    }

    // --- Coleta e validação de dimensões ---
    if (tipo === 'comprimento') {
        comprimentoCm = parseFloat(document.getElementById('comprimento-cm').value);
        if (isNaN(comprimentoCm) || comprimentoCm <= 0) {
            alert("Por favor, insira um comprimento válido (maior que zero).");
            return;
        }
    } else if (tipo === 'litro') {
        volumeMl = parseFloat(document.getElementById('volume-ml').value);
        if (isNaN(volumeMl) || volumeMl <= 0) {
            alert("Por favor, insira um volume válido (maior que zero).");
            return;
        }
    } else if (tipo === 'quilo') {
        pesoG = parseFloat(document.getElementById('peso-g').value);
        if (isNaN(pesoG) || pesoG <= 0) {
            alert("Por favor, insira um peso válido (maior que zero).");
            return;
        }
    } else if (tipo === 'area') {
        larguraCm = parseFloat(document.getElementById('largura-cm').value);
        alturaCm = parseFloat(document.getElementById('altura-cm').value);
        if (isNaN(larguraCm) || larguraCm <= 0 || isNaN(alturaCm) || alturaCm <= 0) {
            alert("Por favor, insira dimensões válidas para a área (maiores que zero).");
            return;
        }
    }

    // --- Cálculo do Custo Unitário ---
    const custoUnitario = calcularCustoUnitario(tipo, valorTotal, comprimentoCm, volumeMl, pesoG, larguraCm, alturaCm);

    // --- Criação do objeto do material ---
    const item = {
        nome,
        tipo,
        custoUnitario,
        comprimentoCm,
        volumeMl,
        pesoG,
        larguraCm,
        alturaCm
    };

    // 1. Adiciona o item ao array de materiais.
    materiais.push(item);

    // 2. Atualiza a tabela *ANTES* de resetar o formulário.
    atualizarTabelaMateriaisInsumos();

    // 3. Limpa *todos* os campos do formulário.
    limparFormulario('form-materiais-insumos');

    // 4. Reseta o título do formulário.
    document.getElementById('titulo-materiais-insumos').textContent = "Cadastro de Materiais e Insumos";

    // 5. Seleciona o radio button "Comprimento" *e* dispara o evento 'change'.
    const radioComprimento = document.querySelector('input[name="tipo-material"][value="comprimento"]');
    radioComprimento.checked = true;
    radioComprimento.dispatchEvent(new Event('change')); // <-- Importante!

    // 6. Garante que o placeholder do comprimento esteja correto (cm).
    document.getElementById('comprimento-cm').placeholder = "Comprimento (cm)";

    // --- SALVAR DADOS e BACKUP AUTOMÁTICO (após adicionar material) ---
    salvarDados();
    backupAutomatico(); // <-- Chamada da função de backup
}
/* ==== FIM SEÇÃO - CADASTRO DE MATERIAL/INSUMO ==== */

/* ==== INÍCIO SEÇÃO - TABELA DE MATERIAL/INSUMO ==== */
/* Atualizar a tabela de Materiais e Insumos */
function atualizarTabelaMateriaisInsumos() {
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    tbody.innerHTML = '';
    materiais.forEach((item, index) => {
        const row = tbody.insertRow();
        const cellNome = row.insertCell();
        const cellTipo = row.insertCell();
        const cellCustoUnit = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNome.textContent = item.nome;
        cellTipo.textContent =
            (item.tipo === 'comprimento' ? 'Comprimento (Metro)' :
                item.tipo === 'litro' ? 'Litro' :
                    item.tipo === 'quilo' ? 'Quilo' :
                        item.tipo === 'area' ? 'Área (m²)' : 'Unidade');
        cellCustoUnit.textContent = formatarMoeda(item.custoUnitario);

        // Botão Editar
        const botaoEditar = document.createElement('button');
        botaoEditar.textContent = 'Editar';
        botaoEditar.addEventListener('click', function() {
            editarMaterialInsumo(index);
        });
        cellAcoes.appendChild(botaoEditar);

        // Botão Remover
        const botaoRemover = document.createElement('button');
        botaoRemover.textContent = 'Remover';
        botaoRemover.addEventListener('click', function() {
            removerMaterialInsumo(index); //  <--  CORRETO (já existia)
        });
        cellAcoes.appendChild(botaoRemover);
    });
}

// Função para buscar materiais cadastrados
function buscarMateriaisCadastrados() {
    const termoBusca = document.getElementById('busca-material').value.toLowerCase();
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    tbody.innerHTML = '';

    const materiaisFiltrados = materiais.filter(item => item.nome.toLowerCase().includes(termoBusca));

    materiaisFiltrados.forEach((item, index) => {
        const row = tbody.insertRow();
        const cellNome = row.insertCell();
        const cellTipo = row.insertCell();
        const cellCustoUnit = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNome.textContent = item.nome;
        cellTipo.textContent = item.tipo;
        cellCustoUnit.textContent = formatarMoeda(item.custoUnitario);

        // Botão Editar
        const botaoEditar = document.createElement('button');
        botaoEditar.textContent = 'Editar';
        botaoEditar.addEventListener('click', function() {
            editarMaterialInsumo(index);
        });
        cellAcoes.appendChild(botaoEditar);

        // Botão Remover
        const botaoRemover = document.createElement('button');
        botaoRemover.textContent = 'Remover';
        botaoRemover.addEventListener('click', function() {
            removerMaterialInsumo(index);
        });
        cellAcoes.appendChild(botaoRemover);
    });
}

function editarMaterialInsumo(index) {
    const item = materiais[index];

    // --- Preenche os campos do formulário ---
    document.getElementById('nome-material').value = item.nome;
    document.getElementById('valor-total-material').value = item.tipo === 'area' ? item.custoUnitario * ((item.larguraCm/100) * (item.alturaCm/100)) : item.custoUnitario;  //Mantem o valor total.

    // Seleciona o radio button correto *e* dispara o evento 'change'
    const radio = document.querySelector(`input[name="tipo-material"][value="${item.tipo}"]`);
    radio.checked = true;
    radio.dispatchEvent(new Event('change')); //  <-- Importante!

    // Preenche os campos de dimensão (se existirem)
    if (item.tipo === 'comprimento') {
        document.getElementById('comprimento-cm').value = item.comprimentoCm;
    } else if (item.tipo === 'litro') {
        document.getElementById('volume-ml').value = item.volumeMl;
    } else if (item.tipo === 'quilo') {
        document.getElementById('peso-g').value = item.pesoG;
    } else if (item.tipo === 'area') {
        document.getElementById('largura-cm').value = item.larguraCm;
        document.getElementById('altura-cm').value = item.alturaCm;
    }

    // --- Remove o item original (vai ser readicionado no final do cadastro) ---
    materiais.splice(index, 1);
    atualizarTabelaMateriaisInsumos();

    // --- Scroll e foco ---
    document.getElementById('materiais-insumos').scrollIntoView({ behavior: 'smooth' });
     document.getElementById('titulo-materiais-insumos').textContent = 'Editar Material/Insumo';
     //  NÃO CHAMA backupAutomatico() aqui!  O backup será feito quando o usuário clicar em "Cadastrar" (que agora funciona como "Salvar Edição").
}

function removerMaterialInsumo(index) {
    materiais.splice(index, 1);
    atualizarTabelaMateriaisInsumos();
    salvarDados();        //  <--  CORRETO (já existia)
    backupAutomatico(); //  <--  ADICIONADO!
}
/* ==== FIM SEÇÃO - TABELA DE MATERIAL/INSUMO ==== */

/* ==== INÍCIO SEÇÃO - MÃO DE OBRA ==== */
// --- Mão de Obra ---
function calcularValorHora() {
    const salario = parseFloat(document.getElementById('salario-receber').value);
    const horas = parseInt(document.getElementById('horas-trabalhadas').value);

    if (isNaN(salario) || isNaN(horas) || horas === 0) {
      document.getElementById('valor-hora').value = '';
      return;
    }

    const valorHora = salario / horas;
    document.getElementById('valor-hora').value = valorHora.toFixed(2);
    return valorHora;
}

function calcularCustoFerias13o() {
    const salario = parseFloat(document.getElementById('salario-receber').value);
    const horas = parseInt(document.getElementById('horas-trabalhadas').value);
    const incluir = document.getElementById('incluir-ferias-13o-sim').checked;

    let custoFerias13o = 0;
    if (incluir) {
        custoFerias13o = ((salario + (salario / 3)) / 12) / horas;
    }
    document.getElementById('custo-ferias-13o').value = custoFerias13o.toFixed(2);
     return custoFerias13o;
}

function salvarMaoDeObra() {
    const valorHora = calcularValorHora();

    if (valorHora === undefined) {
        alert('Preencha os campos de salário e horas corretamente.');
        return;
    }

    maoDeObra.salario = parseFloat(document.getElementById('salario-receber').value);
    maoDeObra.horas = parseInt(document.getElementById('horas-trabalhadas').value);
    maoDeObra.valorHora = valorHora;
    maoDeObra.incluirFerias13o = document.getElementById('incluir-ferias-13o-sim').checked;
    maoDeObra.custoFerias13o = calcularCustoFerias13o();

    document.getElementById('salario-receber').value = maoDeObra.salario;
    document.getElementById('horas-trabalhadas').value = maoDeObra.horas;
    document.getElementById('valor-hora').value = maoDeObra.valorHora.toFixed(2);
    document.getElementById('custo-ferias-13o').value = maoDeObra.custoFerias13o.toFixed(2);

    alert("Dados de mão de obra salvos com sucesso!");

    modoEdicaoMaoDeObra = true;
    document.getElementById('btn-salvar-mao-de-obra').style.display = 'none';
    document.getElementById('btn-editar-mao-de-obra').style.display = 'inline-block';

    document.getElementById('titulo-mao-de-obra').textContent = 'Informações sobre custo de mão de obra';
    document.getElementById('salario-receber').readOnly = true;
    document.getElementById('horas-trabalhadas').readOnly = true;

     atualizarTabelaCustosIndiretos(); // <---  Atualiza após salvar
     calcularCustos(); // Importante para atualizar a seção de cálculo

     // --- SALVAR DADOS e BACKUP (após salvar mão de obra) ---
     salvarDados();
     backupAutomatico(); // <-- JÁ ESTAVA CORRETO (você já tinha adicionado)
}

function editarMaoDeObra() {
    modoEdicaoMaoDeObra = false;

    document.getElementById('salario-receber').readOnly = false;
    document.getElementById('horas-trabalhadas').readOnly = false;

    document.getElementById('btn-editar-mao-de-obra').style.display = 'none';
    document.getElementById('btn-salvar-mao-de-obra').style.display = 'inline-block';

    document.getElementById('mao-de-obra').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('titulo-mao-de-obra').textContent = 'Informações sobre custo de mão de obra';
     // NÃO chama salvarDados() nem backupAutomatico() aqui!
    // O backup será feito quando o usuário clicar em "Salvar".
}

document.getElementById('salario-receber').addEventListener('input', function(){
    calcularValorHora();
    calcularCustoFerias13o();
});
document.getElementById('horas-trabalhadas').addEventListener('input', function(){
    calcularValorHora();
    calcularCustoFerias13o();
    atualizarTabelaCustosIndiretos(); // <--- Atualiza a tabela aqui!
    calcularCustos();  // <-- Importantíssimo! Recalcula após mudar horas
});
/* ==== FIM SEÇÃO - MÃO DE OBRA ==== */

/* ==== INÍCIO SEÇÃO - CUSTOS INDIRETOS ==== */
// --- Custos Indiretos ---

function carregarCustosIndiretosPredefinidos() {
    const listaCustos = document.getElementById('lista-custos-indiretos');
    listaCustos.innerHTML = '';

    custosIndiretosPredefinidosBase.forEach((custoBase, index) => {
        const listItem = document.createElement('li');
        // Encontra o custo correspondente ou usa o custo base
        const custoAtual = custosIndiretosPredefinidos.find(c => c.descricao === custoBase.descricao) || { ...custoBase };
        listItem.innerHTML = `
            <div class="custo-item-nome">${custoBase.descricao}</div>
            <input type="number" id="custo-indireto-${index}" value="${custoAtual.valorMensal.toFixed(2)}" step="0.01">
            <button onclick="salvarCustoIndiretoPredefinido(${index})">Salvar</button>
        `;
        listaCustos.appendChild(listItem);
    });

    // Custos Adicionais
    custosIndiretosAdicionais.forEach((custo) => {
        const listItem = document.createElement('li');
        listItem.dataset.index = custo.tempIndex; // Importante para identificar na remoção
        listItem.innerHTML = `
            <div class="custo-item-nome">${custo.descricao}</div>
            <input type="number" value="${custo.valorMensal.toFixed(2)}" step="0.01">
            <button onclick="salvarNovoCustoIndiretoLista(this)" data-index="${custo.tempIndex}">Salvar</button>
            <button onclick="removerNovoCustoIndiretoLista(this)" data-index="${custo.tempIndex}">Remover</button>
        `;
        listaCustos.appendChild(listItem);
    });

    atualizarTabelaCustosIndiretos();
}

function salvarCustoIndiretoPredefinido(index) {
    const inputValor = document.getElementById(`custo-indireto-${index}`);
    const novoValor = parseFloat(inputValor.value);
    const descricao = custosIndiretosPredefinidosBase[index].descricao;  //Pega a descrição da base

    if (!isNaN(novoValor)) {
        // Atualiza o custo predefinido, usando a descrição para encontrar o objeto correto
        const custoParaAtualizar = custosIndiretosPredefinidos.find(c => c.descricao === descricao);
        if(custoParaAtualizar){
            custoParaAtualizar.valorMensal = novoValor;
        }
        atualizarTabelaCustosIndiretos();
        calcularCustos(); // <-- Importante! Recalcula após salvar custo indireto
        salvarDados(); // <-- Salva após salvar custo indireto
        backupAutomatico(); // <-- ADICIONADO!
    } else {
        alert("Por favor, insira um valor numérico válido.");
    }
}

function adicionarNovoCustoIndireto() {
    const listaCustos = document.getElementById('lista-custos-indiretos');
    const novoIndex = `novoCusto-${novoCustoIndiretoCounter++}`; // ID único

    const listItem = document.createElement('li');
    listItem.dataset.index = novoIndex;  // Armazena o ID
    listItem.innerHTML = `
        <input type="text" class="custo-item-nome" placeholder="Descrição do novo custo">
        <input type="number" value="0.00" step="0.01">
        <button onclick="salvarNovoCustoIndiretoLista(this)" data-index="${novoIndex}">Salvar</button>
        <button onclick="removerNovoCustoIndiretoLista(this)" data-index="${novoIndex}">Remover</button>
    `;
    listaCustos.appendChild(listItem);
}

function salvarNovoCustoIndiretoLista(botao) {
    const listItem = botao.parentNode;
    const descricaoInput = listItem.querySelector('.custo-item-nome');
    const valorInput = listItem.querySelector('input[type="number"]');
    const index = botao.dataset.index; // Recupera o ID

    const descricao = descricaoInput.value.trim();
    const valorMensal = parseFloat(valorInput.value);

    if (descricao && !isNaN(valorMensal)) {
        // Procura se o custo já existe
        const custoExistenteIndex = custosIndiretosAdicionais.findIndex(c => c.tempIndex === index);

        if (custoExistenteIndex !== -1) {
            // Atualiza o custo existente
            custosIndiretosAdicionais[custoExistenteIndex] = { descricao: descricao, valorMensal: valorMensal, tempIndex: index };
        } else {
            // Adiciona o novo custo
            custosIndiretosAdicionais.push({ descricao: descricao, valorMensal: valorMensal, tempIndex: index });
        }
        atualizarTabelaCustosIndiretos(); // Atualiza a tabela
        calcularCustos();  // <-- Importante!
        salvarDados();  // <-- Importante! Salva após modificar
        backupAutomatico(); // <-- ADICIONADO!
    } else {
        alert("Por favor, preencha a descrição e insira um valor numérico válido.");
    }
}

function removerNovoCustoIndiretoLista(botaoRemover) {
    const listItem = botaoRemover.parentNode;
    const indexToRemove = botaoRemover.dataset.index; // Recupera o ID

    // Filtra o array, removendo o item com o ID correto
    custosIndiretosAdicionais = custosIndiretosAdicionais.filter(custo => custo.tempIndex !== indexToRemove);
    listItem.remove();
    atualizarTabelaCustosIndiretos();
    calcularCustos(); // <-- Importante!
    salvarDados();  // <-- Importante! Salva após remover
     backupAutomatico(); // <-- ADICIONADO!
}

function atualizarTabelaCustosIndiretos() {
    const tbody = document.querySelector('#tabela-custos-indiretos tbody');
    tbody.innerHTML = '';
    const horasTrabalhadas = maoDeObra.horas;

    if (horasTrabalhadas === undefined || horasTrabalhadas === null || horasTrabalhadas <= 0) {
        const row = tbody.insertRow();
        const cellMensagem = row.insertCell();
        cellMensagem.textContent = "Preencha as 'Horas trabalhadas por mês' no menu 'Custo de Mão de Obra' para calcular o custo por hora.";
        cellMensagem.colSpan = 4; // Ocupa todas as colunas
        return; // Sai da função, pois não há como calcular
    }

    // Filtra os custos para exibir apenas os que têm valor maior que zero
    const custosPredefinidosParaExibir = custosIndiretosPredefinidos.filter(custo => custo.valorMensal > 0);
    const custosAdicionaisParaExibir = custosIndiretosAdicionais.filter(custo => custo.valorMensal > 0);


    // Adiciona os custos predefinidos (somente os filtrados)
    custosPredefinidosParaExibir.forEach((custo, index) => {
        const row = tbody.insertRow();
        const cellDescricao = row.insertCell();
        const cellValorMensal = row.insertCell();
        const cellValorHoraTrabalhada = row.insertCell();
        const cellAcoes = row.insertCell();

        cellDescricao.textContent = custo.descricao;
        cellValorMensal.textContent = formatarMoeda(custo.valorMensal);
        const valorPorHora = custo.valorMensal / horasTrabalhadas;
        cellValorHoraTrabalhada.textContent = formatarMoeda(valorPorHora);

        // Botão Zerar
        const botaoZerar = document.createElement('button');
        botaoZerar.textContent = 'Zerar';
        botaoZerar.onclick = () => zerarCustoIndireto(index, 'predefinido');
        cellAcoes.appendChild(botaoZerar);
    });

    // Adiciona os custos adicionais (somente os filtrados)
    custosAdicionaisParaExibir.forEach((custo) => {
        const row = tbody.insertRow();
        const cellDescricao = row.insertCell();
        const cellValorMensal = row.insertCell();
        const cellValorHoraTrabalhada = row.insertCell();
        const cellAcoes = row.insertCell();

        cellDescricao.textContent = custo.descricao;
        cellValorMensal.textContent = formatarMoeda(custo.valorMensal);
        const valorPorHora = custo.valorMensal / horasTrabalhadas;
        cellValorHoraTrabalhada.textContent = formatarMoeda(valorPorHora);

        // Botão Zerar para custos adicionais
        const botaoZerar = document.createElement('button');
        botaoZerar.textContent = 'Zerar';
        botaoZerar.onclick = () => zerarCustoIndireto(custo.tempIndex, 'adicional'); // Passa o tempIndex
        cellAcoes.appendChild(botaoZerar);
    });
}

function zerarCustoIndireto(indexOuTempIndex, tipo) {
    if (tipo === 'predefinido') {
        // Zera um custo predefinido
        custosIndiretosPredefinidos[indexOuTempIndex].valorMensal = 0;
        // Atualiza o valor no input correspondente
        document.getElementById(`custo-indireto-${indexOuTempIndex}`).value = '0.00';
    } else if (tipo === 'adicional') {
        // Zera um custo adicional
        const custoAdicionalIndex = custosIndiretosAdicionais.findIndex(c => c.tempIndex === indexOuTempIndex);
        if (custoAdicionalIndex !== -1) {
            custosIndiretosAdicionais[custoAdicionalIndex].valorMensal = 0;
        }
    }
    atualizarTabelaCustosIndiretos(); // Atualiza a tabela após zerar
    calcularCustos(); // <-- Importante!
    salvarDados();  // <-- Importante! Salva após zerar
    backupAutomatico(); // <-- ADICIONADO!
}


function buscarCustosIndiretosCadastrados() {
    const termoBusca = document.getElementById('busca-custo-indireto').value.toLowerCase();
    const tbody = document.querySelector('#tabela-custos-indiretos tbody');
    tbody.innerHTML = '';

    const horasTrabalhadas = maoDeObra.horas;
    if (horasTrabalhadas === undefined || horasTrabalhadas === null || horasTrabalhadas <= 0) {
        const row = tbody.insertRow();
        const cellMensagem = row.insertCell();
        cellMensagem.textContent = "Preencha as 'Horas trabalhadas por mês' no menu 'Custo de Mão de Obra' para calcular o custo por hora.";
        cellMensagem.colSpan = 4;
        return;
    }

    const custosExibicao = [...custosIndiretosPredefinidos, ...custosIndiretosAdicionais].filter(custo => custo.valorMensal > 0);
    const custosFiltrados = custosExibicao.filter(custo => custo.descricao.toLowerCase().includes(termoBusca));

    custosFiltrados.forEach((custo) => {
        const originalIndexPredefinidos = custosIndiretosPredefinidos.findIndex(c => c.descricao === custo.descricao);
        const originalAdicional = custosIndiretosAdicionais.find(c => c.descricao === custo.descricao && c.tempIndex === custo.tempIndex);


        if (custo.valorMensal > 0 || originalAdicional) {
            const row = tbody.insertRow();
            const cellDescricao = row.insertCell();
            const cellValorMensal = row.insertCell();
            const cellValorHoraTrabalhada = row.insertCell();
            const cellAcoes = row.insertCell();

            cellDescricao.textContent = custo.descricao;
            cellValorMensal.textContent = formatarMoeda(custo.valorMensal);

            const valorPorHora = custo.valorMensal / horasTrabalhadas;
            cellValorHoraTrabalhada.textContent = formatarMoeda(valorPorHora);

            // Usa o tipo e o índice/tempIndex corretos
            let botaoAcao;
            if (originalIndexPredefinidos !== -1) {
                botaoAcao = document.createElement('button');
                botaoAcao.textContent = 'Zerar';
                botaoAcao.onclick = function() { zerarCustoIndireto(originalIndexPredefinidos, 'predefinido'); };
            } else if (originalAdicional) {
                botaoAcao = document.createElement('button');
                botaoAcao.textContent = 'Zerar'; // Usa "Zerar" em vez de "Remover"
                botaoAcao.onclick = function() { zerarCustoIndireto(custo.tempIndex, 'adicional'); };
            }

            cellAcoes.appendChild(botaoAcao);

        }
    });
}
/* ==== FIM SEÇÃO - CUSTOS INDIRETOS ==== */

/* ==== INÍCIO SEÇÃO - PRODUTOS CADASTRADOS ==== */
// --- Produtos Cadastrados ---
function cadastrarProduto() {
    const nomeProduto = document.getElementById('nome-produto').value;
    const tabelaMateriaisProduto = document.getElementById('tabela-materiais-produto').querySelector('tbody');
    const linhasMateriais = tabelaMateriaisProduto.rows;

    if (!nomeProduto || linhasMateriais.length === 0) {
        alert("Por favor, preencha o nome do produto e adicione pelo menos um material.");
        return;
    }

    let materiaisDoProduto = [];
    let custoTotalMateriaisProduto = 0;

    for (let i = 0; i < linhasMateriais.length; i++) {
        const linha = linhasMateriais[i];
        const nomeMaterial = linha.cells[0].textContent;
        const tipoMaterial = linha.cells[1].textContent.split(' ')[0]; // Pega só a primeira parte (tipo)
        const custoUnitarioMaterial = parseFloat(linha.cells[2].textContent.replace(/[^\d.,-]/g, '').replace('.', '').replace(',', '.'));

        // --- DIMENSÕES (agora em sua própria célula) ---
        const larguraInput = linha.cells[3].querySelector('.dimensoes-input.largura');
        const alturaInput = linha.cells[3].querySelector('.dimensoes-input.altura');
        const comprimentoInput = linha.cells[3].querySelector('.dimensoes-input.comprimento'); //Se for comprimento

        const largura = larguraInput ? parseFloat(larguraInput.value) : 0;
        const altura = alturaInput ? parseFloat(alturaInput.value) : 0;
        const comprimento = comprimentoInput? parseFloat(comprimentoInput.value) : 0;


        // --- QUANTIDADE (agora separada das dimensões) ---
        const quantidadeInput = linha.cells[4].querySelector('.quantidade-input');  // Célula 4
        let quantidadeMaterial = quantidadeInput ? parseFloat(quantidadeInput.value) : 0;


        // --- CÁLCULO DO CUSTO TOTAL (CORREÇÃO AQUI) ---
        let custoTotalMaterial = 0;
        if (tipoMaterial === 'Área') {
            const area = (largura * altura) / 10000; // Calcula a área em m²
            custoTotalMaterial = custoUnitarioMaterial * area;
        } else if (tipoMaterial === 'Comprimento') {
            // CONVERTE comprimento de cm para m ANTES de calcular o custo
            const comprimentoEmMetros = comprimento / 100;
            custoTotalMaterial = custoUnitarioMaterial * comprimentoEmMetros; // Usa o comprimento em METROS
        } else {
            custoTotalMaterial = custoUnitarioMaterial * quantidadeMaterial;
        }


        materiaisDoProduto.push({
            nome: nomeMaterial,
            tipo: tipoMaterial,
            custoUnitario: custoUnitarioMaterial,
            largura: largura,      // Valor da largura
            altura: altura,       // Valor da altura
            comprimento: comprimento, //Comprimento *em cm* (para consistência e edição)
            quantidade: quantidadeMaterial, // Valor da QUANTIDADE (separado)
            custoTotal: custoTotalMaterial
        });
        custoTotalMateriaisProduto += custoTotalMaterial;
    }

    const produto = {
        nome: nomeProduto,
        materiais: materiaisDoProduto,
        custoMateriais: custoTotalMateriaisProduto
    };
    produtos.push(produto);

    atualizarTabelaProdutosCadastrados();
    limparFormulario('form-produtos-cadastrados');
    tabelaMateriaisProduto.innerHTML = '';
    alert('Produto cadastrado com sucesso!');
    salvarDados(); // <-- Salva após cadastrar
    backupAutomatico(); // <-- ADICIONADO!
}

function atualizarTabelaProdutosCadastrados() {
    const tbody = document.querySelector('#tabela-produtos tbody');
    tbody.innerHTML = '';

    produtos.forEach((produto, index) => {
        const row = tbody.insertRow();
        const cellNomeProduto = row.insertCell();
        const cellMateriaisUtilizados = row.insertCell();
        const cellCustoTotalMateriais = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNomeProduto.textContent = produto.nome;

        let listaMateriaisHTML = '<ul>';
        produto.materiais.forEach(material => {
            let dimensoesTexto = '';
            if (material.tipo === 'Área') {
                dimensoesTexto = `(${material.largura.toFixed(2)}cm x ${material.altura.toFixed(2)}cm)`;
            } else if (material.tipo === 'Comprimento') {
                dimensoesTexto = `(${material.comprimento.toFixed(2)}cm)`;
            }
            listaMateriaisHTML += `<li>${material.nome} ${dimensoesTexto} - ${formatarMoeda(material.custoTotal)} (Qtd: ${material.quantidade.toFixed(2)})</li>`;
        });
        listaMateriaisHTML += '</ul>';
        cellMateriaisUtilizados.innerHTML = listaMateriaisHTML;
        cellCustoTotalMateriais.textContent = formatarMoeda(produto.custoMateriais);

        const botaoEditarProduto = document.createElement('button');
        botaoEditarProduto.textContent = 'Editar';
        botaoEditarProduto.addEventListener('click', function() {
            editarProduto(index);
        });
        cellAcoes.appendChild(botaoEditarProduto);

        const botaoRemoverProduto = document.createElement('button');
        botaoRemoverProduto.textContent = 'Remover';
        botaoRemoverProduto.addEventListener('click', function() {
            removerProduto(index);
        });
        cellAcoes.appendChild(botaoRemoverProduto);
    });
}

function buscarProdutosCadastrados() {
    const termoBusca = document.getElementById('busca-produto').value.toLowerCase();
    const tbody = document.querySelector('#tabela-produtos tbody');
    tbody.innerHTML = '';

    const produtosFiltrados = produtos.filter(produto => produto.nome.toLowerCase().includes(termoBusca));

    produtosFiltrados.forEach((produto, index) => {
		const row = tbody.insertRow();
        const cellNomeProduto = row.insertCell();
        const cellMateriaisUtilizados = row.insertCell();
        const cellCustoTotalMateriais = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNomeProduto.textContent = produto.nome;

        let listaMateriaisHTML = '<ul>';
        produto.materiais.forEach(material => {
			//Modificação para exibir largura e altura.
            let dimensoesTexto = '';
            if (material.tipo === 'Área') {
                dimensoesTexto = `(${material.largura.toFixed(2)}cm x ${material.altura.toFixed(2)}cm)`;
            }else if (material.tipo === 'Comprimento') {
                dimensoesTexto = `(${material.comprimento.toFixed(2)}cm)`; //Mostra o comprimento
            }
            listaMateriaisHTML += `<li>${material.nome} ${dimensoesTexto} - ${formatarMoeda(material.custoTotal)} (Qtd: ${material.quantidade.toFixed(2)})</li>`;
        });
        listaMateriaisHTML += '</ul>';
        cellMateriaisUtilizados.innerHTML = listaMateriaisHTML;
        cellCustoTotalMateriais.textContent = formatarMoeda(produto.custoMateriais);

        const botaoEditarProduto = document.createElement('button');
        botaoEditarProduto.textContent = 'Editar';
        botaoEditarProduto.addEventListener('click', function() {
            editarProduto(index);
        });
        cellAcoes.appendChild(botaoEditarProduto);

        const botaoRemoverProduto = document.createElement('button');
        botaoRemoverProduto.textContent = 'Remover';
        botaoRemoverProduto.addEventListener('click', function() {
            removerProduto(index);
        });
        cellAcoes.appendChild(botaoRemoverProduto);
    });
}

function adicionarMaterialNaTabelaProduto(material) {
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    const row = tbody.insertRow();
    const cellNome = row.insertCell();
    const cellTipo = row.insertCell();
    const cellCustoUnitario = row.insertCell();
    const cellDimensoes = row.insertCell();
    const cellQuantidade = row.insertCell();
    const cellCustoTotal = row.insertCell();
    const cellAcoes = row.insertCell();

    cellNome.textContent = material.nome;
    let unidade = '';
    switch (material.tipo) {
        case 'comprimento': unidade = ' (m)'; break;
        case 'litro': unidade = ' (L)'; break;
        case 'quilo': unidade = ' (kg)'; break;
        case 'unidade': unidade = ' (un)'; break;
        case 'area': unidade = ' (m²)'; break;
    }
    cellTipo.textContent = material.tipo.charAt(0).toUpperCase() + material.tipo.slice(1) + unidade;
    cellCustoUnitario.textContent = formatarMoeda(material.custoUnitario);

    // --- Campos de Dimensões (Largura, Altura e Comprimento) ---
    // MODIFICAÇÃO AQUI: Adiciona a unidade de medida ao placeholder
    let larguraInput, alturaInput, comprimentoInput;

    if (material.tipo === 'area') {
        larguraInput = document.createElement('input');
        larguraInput.type = 'number';
        larguraInput.placeholder = 'Largura (cm)'; // Adiciona (cm)
        larguraInput.min = 0.01;
        larguraInput.step = 0.01;
        larguraInput.classList.add('dimensoes-input', 'largura');
        larguraInput.value = material.largura || '';

        alturaInput = document.createElement('input');
        alturaInput.type = 'number';
        alturaInput.placeholder = 'Altura (cm)'; // Adiciona (cm)
        alturaInput.min = 0.01;
        alturaInput.step = 0.01;
        alturaInput.classList.add('dimensoes-input', 'altura');
        alturaInput.value = material.altura || '';

        cellDimensoes.appendChild(larguraInput);
        cellDimensoes.appendChild(alturaInput);

    } else if (material.tipo === 'comprimento') {
        comprimentoInput = document.createElement('input');
        comprimentoInput.type = 'number';
        comprimentoInput.placeholder = 'Comprimento (cm)'; // Adiciona (cm)
        comprimentoInput.min = 0.01;
        comprimentoInput.step = 0.01;
        comprimentoInput.classList.add('dimensoes-input', 'comprimento');
        comprimentoInput.value = material.comprimento || '';
        cellDimensoes.appendChild(comprimentoInput);
    }
    // --- Campo de Quantidade (AGORA SEPARADO) ---
    const inputQuantidade = document.createElement('input');
    inputQuantidade.type = 'number';
    inputQuantidade.value = material.quantidade || 1;
    inputQuantidade.min = 0.01;
    inputQuantidade.step = 0.01;
    inputQuantidade.classList.add('quantidade-input');
    inputQuantidade.readOnly = material.tipo === 'area';


    const unidadeMedidaSpan = document.createElement('span');
    unidadeMedidaSpan.classList.add('unidade-medida');
    // --- Lógica para Área (agora calcula e exibe a área corretamente) ---
    if (material.tipo === 'area') {
        const areaSpan = document.createElement('span');
        areaSpan.classList.add('dimensoes-span');
        cellDimensoes.appendChild(areaSpan);
        unidadeMedidaSpan.textContent = '';

        // Função para calcular a área e atualizar o custo total
        function calcularAreaEAtualizar() {
            const largura = parseFloat(larguraInput.value) || 0;
            const altura = parseFloat(alturaInput.value) || 0;

            if (isNaN(largura) || largura <= 0 || isNaN(altura) || altura <= 0) {
                areaSpan.textContent = '0.00 m²';
                inputQuantidade.value = 0;
                calcularCustoTotalMaterial();
                return;
            }

            const area = (largura * altura) / 10000;
            areaSpan.textContent = area.toFixed(2) + ' m²';
            inputQuantidade.value = area.toFixed(2);
            calcularCustoTotalMaterial();
        }

        larguraInput.addEventListener('input', calcularAreaEAtualizar);
        alturaInput.addEventListener('input', calcularAreaEAtualizar);

        calcularAreaEAtualizar();

    } else if(material.tipo === 'comprimento'){
        const comprimentoSpan = document.createElement('span');
        comprimentoSpan.classList.add('dimensoes-span');
        cellDimensoes.appendChild(comprimentoSpan);
        unidadeMedidaSpan.textContent = '';

        function calcularComprimentoEAtualizar(){
            const comprimento = parseFloat(comprimentoInput.value) || 0;

            if(isNaN(comprimento) || comprimento <= 0){
                comprimentoSpan.textContent = '0.00 cm';
                inputQuantidade.value = 0;
                calcularCustoTotalMaterial();
                return;
            }

            comprimentoSpan.textContent = comprimento.toFixed(2) + ' cm';
            inputQuantidade.value = comprimento.toFixed(2);
            calcularCustoTotalMaterial();
        }
        comprimentoInput.addEventListener('input', calcularComprimentoEAtualizar);
        calcularComprimentoEAtualizar();

    }else {
        unidadeMedidaSpan.textContent = unidade;
        inputQuantidade.addEventListener('input', calcularCustoTotalMaterial);
    }

    cellQuantidade.appendChild(inputQuantidade);
    cellQuantidade.appendChild(unidadeMedidaSpan);


    // --- Função para calcular o custo total ---
    function calcularCustoTotalMaterial() {
        let quantidade = parseFloat(inputQuantidade.value);
         if (isNaN(quantidade) || quantidade <= 0) {
            if(material.tipo !== 'area' && material.tipo !== 'comprimento'){
                quantidade = 0.01;
                inputQuantidade.value = quantidade;
            } else{
                quantidade = 0;
            }
        }

        let custoTotal = 0;
        if(material.tipo === "area"){
            const largura = parseFloat(larguraInput.value) || 0;
            const altura = parseFloat(alturaInput.value) || 0;
            const area = (largura * altura) / 10000;
            custoTotal = material.custoUnitario * area;

        } else if(material.tipo === "comprimento") {
            const comprimento = parseFloat(comprimentoInput.value) || 0;
            const comprimentoEmMetros = comprimento / 100;
            custoTotal = material.custoUnitario * comprimentoEmMetros;

        } else {
          custoTotal = material.custoUnitario * quantidade;
        }

        cellCustoTotal.textContent = formatarMoeda(custoTotal);
    }

    calcularCustoTotalMaterial();


    const botaoRemoverMaterial = document.createElement('button');
    botaoRemoverMaterial.textContent = 'Remover';
    botaoRemoverMaterial.addEventListener('click', function() {
        removerLinhaMaterial(row);
    });
    cellAcoes.appendChild(botaoRemoverMaterial);
}

function editarProduto(index) {
    const produto = produtos[index];
    if (!produto) return;

    document.getElementById('nome-produto').value = produto.nome;

    const tabelaMateriaisProdutoBody = document.querySelector('#tabela-materiais-produto tbody');
    tabelaMateriaisProdutoBody.innerHTML = '';

    produto.materiais.forEach(material => {
        adicionarMaterialNaTabelaProduto(material);
    });

     //  REMOVE o produto da lista *ANTES* de salvar a edição.
    produtos.splice(index, 1);
    atualizarTabelaProdutosCadastrados();
    document.getElementById('produtos-cadastrados').scrollIntoView({ behavior: 'smooth' });
    document.querySelector('#produtos-cadastrados h2').textContent = 'Editar Produto';
     //  NÃO chama backupAutomatico() aqui!  O backup será feito quando o usuário clicar em "Cadastrar" (que, no modo de edição, funciona como "Salvar").
}

function removerProduto(index) {
    produtos.splice(index, 1);
    atualizarTabelaProdutosCadastrados();
    salvarDados(); // <-- Salva após remover
    backupAutomatico(); // <-- ADICIONADO!
}

// --- Pesquisa e Adição de Materiais na Seção Produtos ---
document.getElementById('pesquisa-material').addEventListener('input', function() {
    const termoPesquisa = this.value.toLowerCase();
    const resultadosPesquisaDiv = document.getElementById('resultados-pesquisa');
    resultadosPesquisaDiv.innerHTML = '';

    if (termoPesquisa.length < 2) {
        resultadosPesquisaDiv.style.display = 'none';
        return;
    }

    const materiaisFiltrados = materiais.filter(material => material.nome.toLowerCase().includes(termoPesquisa));

    if (materiaisFiltrados.length > 0) {
        resultadosPesquisaDiv.style.display = 'block';
        materiaisFiltrados.forEach(material => {
            const resultadoDiv = document.createElement('div');
            resultadoDiv.textContent = material.nome + ' (' + material.tipo + ') - Custo Unitário: ' + formatarMoeda(material.custoUnitario);
            resultadoDiv.addEventListener('click', function() {
                adicionarMaterialNaTabelaProduto(material);
                document.getElementById('pesquisa-material').value = '';
                resultadosPesquisaDiv.innerHTML = '';
                resultadosPesquisaDiv.style.display = 'none';
            });
            resultadosPesquisaDiv.appendChild(resultadoDiv);
        });
    } else {
        resultadosPesquisaDiv.style.display = 'none';
    }
});

function removerLinhaMaterial(row) {
    row.remove();
}
/* ==== FIM SEÇÃO - PRODUTOS CADASTRADOS ==== */

/* ==== INÍCIO SEÇÃO - CÁLCULO DA PRECIFICAÇÃO ==== */
// --- Cálculo da Precificação (Refatorado) ---

function buscarProdutosAutocomplete() {
    const termo = document.getElementById('produto-pesquisa').value.toLowerCase();
    const resultadosDiv = document.getElementById('produto-resultados');
    resultadosDiv.innerHTML = ''; // Limpa resultados anteriores
    resultadosDiv.classList.remove('hidden'); //Mostra a div

    if (termo.length < 2) {
        resultadosDiv.classList.add('hidden'); //Esconde se termo muito curto.
        return; // Sai se o termo for muito curto
    }

    const produtosFiltrados = produtos.filter(produto => produto.nome.toLowerCase().includes(termo));

    if (produtosFiltrados.length > 0) {
        produtosFiltrados.forEach(produto => {
            const div = document.createElement('div');
            div.textContent = produto.nome;
            div.addEventListener('click', function() {
                selecionarProduto(produto.nome); // Função para selecionar
                resultadosDiv.classList.add('hidden'); // Esconde após seleção
            });
            resultadosDiv.appendChild(div);
        });
    } else {
       resultadosDiv.classList.add('hidden'); //Esconde caso não encontre.
    }
}

function selecionarProduto(nomeProduto) {
    document.getElementById('produto-pesquisa').value = nomeProduto; // Preenche o campo
    carregarDadosProduto(nomeProduto); // Carrega os dados (custo)
}

function carregarDadosProduto(nomeProduto) {
    const produto = produtos.find(p => p.nome === nomeProduto);

    if (produto) {
        document.getElementById('custo-produto').textContent = formatarMoeda(produto.custoMateriais);
        // Exibe os detalhes do produto (materiais)
        const detalhesProdutoDiv = document.getElementById('detalhes-produto');
        const listaMateriais = document.getElementById('lista-materiais-produto');
        listaMateriais.innerHTML = ''; // Limpa a lista

        produto.materiais.forEach(material => {
            //Modificação para exibir largura e altura
			let dimensoesTexto = '';
            if (material.tipo === 'Área') {
                dimensoesTexto = `(${material.largura.toFixed(2)}cm x ${material.altura.toFixed(2)}cm)`;
            }else if (material.tipo === 'Comprimento') {
                dimensoesTexto = `(${material.comprimento.toFixed(2)}cm)`; //Mostra o comprimento
            }
            const li = document.createElement('li');
            li.textContent = `${material.nome} ${dimensoesTexto} (${material.tipo}) - Qtd: ${material.quantidade.toFixed(2)} - Custo: ${formatarMoeda(material.custoTotal)}`;  //Quantidade com 2 casas
            listaMateriais.appendChild(li);
        });
        detalhesProdutoDiv.style.display = 'block'; // Mostra a div

        calcularCustos(); // Recalcula *tudo*
    } else {
        document.getElementById('custo-produto').textContent = 'R$ 0,00';
         document.getElementById('detalhes-produto').style.display = 'none'; // Esconde se não tiver produto
    }
}

function calcularCustos() {
    const horasProduto = parseFloat(document.getElementById('horas-produto').value) || 0;

    // 1. Custo de Mão de Obra (DETALHADO)
    const custoMaoDeObra = maoDeObra.valorHora * horasProduto;
    const custoFerias13o = maoDeObra.custoFerias13o * horasProduto;
    const totalMaoDeObra = custoMaoDeObra + custoFerias13o;

    document.getElementById('custo-mao-de-obra-detalhe').textContent = formatarMoeda(custoMaoDeObra);
    document.getElementById('custo-ferias-13o-detalhe').textContent = formatarMoeda(custoFerias13o);
    document.getElementById('total-mao-de-obra').textContent = formatarMoeda(totalMaoDeObra);


    // 2. Custo do Produto (já é carregado em carregarDadosProduto)

    // 3. Custos Indiretos (DETALHADO, por item, e SÓ SE > 0)
    let custoIndiretoTotalProduto = 0;
    const listaCustosIndiretosDetalhes = document.getElementById('lista-custos-indiretos-detalhes');
    listaCustosIndiretosDetalhes.innerHTML = ''; // Limpa a lista

    custosIndiretosPredefinidos.forEach(custo => {
        const custoPorHora = custo.valorMensal / maoDeObra.horas;
        const custoItemProduto = custoPorHora * horasProduto;

        // AQUI: Só adiciona à lista se o custo for > 0
        if (custoItemProduto > 0) {
            custoIndiretoTotalProduto += custoItemProduto;
            const li = document.createElement('li');
            li.textContent = `${custo.descricao}: ${formatarMoeda(custoItemProduto)}`;
            listaCustosIndiretosDetalhes.appendChild(li);
        }
    });

    custosIndiretosAdicionais.forEach(custo => {
        const custoPorHora = custo.valorMensal / maoDeObra.horas;
        const custoItemProduto = custoPorHora * horasProduto;

        // AQUI: Só adiciona à lista se o custo for > 0
        if (custoItemProduto > 0) {
            custoIndiretoTotalProduto += custoItemProduto;
            const li = document.createElement('li');
            li.textContent = `${custo.descricao}: ${formatarMoeda(custoItemProduto)}`;
            listaCustosIndiretosDetalhes.appendChild(li);
        }
    });

     document.getElementById('custo-indireto').textContent = formatarMoeda(custoIndiretoTotalProduto); // Total (por hora)

    // 4. Subtotal
    const nomeProduto = document.getElementById('produto-pesquisa').value;
    const produto = produtos.find(p => p.nome === nomeProduto);
    const custoProduto = produto ? produto.custoMateriais : 0;
    const subtotal = custoProduto + totalMaoDeObra + custoIndiretoTotalProduto;
    document.getElementById('subtotal').textContent = formatarMoeda(subtotal);

    calcularPrecoVendaFinal(); //Chama para já calcular com os novos valores.
}

function calcularPrecoVendaFinal(){
    const margemLucro = parseFloat(document.getElementById('margem-lucro-final').value) / 100 || 0;
    const subtotalTexto = document.getElementById('subtotal').textContent;

    // Converte o subtotal para um número, tratando a formatação de moeda
    const subtotalNumerico = parseFloat(subtotalTexto.replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const precoVenda = subtotalNumerico * (1 + margemLucro);
     const margemLucroValor = precoVenda - subtotalNumerico; //Calcula a margem
    document.getElementById('margem-lucro-valor').textContent = formatarMoeda(margemLucroValor);
    document.getElementById('total-final').textContent = formatarMoeda(precoVenda);

    calcularTotalComTaxas(); //Chama a função para o cálculo final.
}

// --- Função para Taxa de Crédito ---
function salvarTaxaCredito() {
    const incluir = document.getElementById('incluir-taxa-credito-sim').checked;
    const percentual = parseFloat(document.getElementById('taxa-credito-percentual').value);

    if (incluir && (isNaN(percentual) || percentual < 0)) {
        alert("Por favor, insira um valor percentual válido para a taxa.");
        return;
    }

    taxaCredito.incluir = incluir;
    taxaCredito.percentual = incluir ? percentual : 0; //Salva 0 se não incluir.
    calcularTotalComTaxas(); //Recalcula o total com a nova taxa.
    salvarDados(); // <-- Salva após alterar taxa
    backupAutomatico();
}

function calcularTotalComTaxas() {
    const precoVendaTexto = document.getElementById('total-final').textContent; //Pega do total com margem.
    const precoVendaNumerico = parseFloat(precoVendaTexto.replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.')) || 0;

    let taxaCreditoValor = 0;
    if (taxaCredito.incluir) {
        taxaCreditoValor = precoVendaNumerico * (taxaCredito.percentual / 100);
    }
    document.getElementById('taxa-credito-valor').textContent = formatarMoeda(taxaCreditoValor);

    const totalFinalComTaxas = precoVendaNumerico + taxaCreditoValor;
    document.getElementById('total-final-com-taxas').textContent = formatarMoeda(totalFinalComTaxas);

    // --- ATUALIZAÇÃO DA MENSAGEM DO TOTAL FINAL ---
    const mensagemTotalFinal = document.querySelector('.total:last-of-type span:first-child'); // Seleciona a label
     if (taxaCredito.incluir) {
        mensagemTotalFinal.textContent = "Total Final (com Taxas do cartão de crédito):";
    } else {
        mensagemTotalFinal.textContent = "Total Final (sem Taxas do cartão de crédito):";
    }
}
/* ==== FIM SEÇÃO - CÁLCULO DA PRECIFICAÇÃO ==== */

/* ==== INÍCIO SEÇÃO - IMPORTAR/EXPORTAR/LIMPAR ==== */
// --- Funções de Importar/Exportar/Limpar (COPIADAS E ADAPTADAS) ---

function exportarDados() {
    // Agora, exportarDados simplesmente chama backupAutomatico.
    // A lógica de gerar o nome do arquivo, criar o blob, etc.,
    // está toda dentro de backupAutomatico.
    backupAutomatico();
}

function importarDados() {
    const inputImportar = document.getElementById('inputImportar');
    if (inputImportar.files.length > 0) {
        const arquivo = inputImportar.files[0];
        const nomeArquivo = arquivo.name;
        const leitor = new FileReader();

        leitor.onload = function(e) {
            try {
                const dadosImportados = JSON.parse(e.target.result);

                // --- IMPORTAÇÃO SEGURA (com verificações) ---
                materiais = dadosImportados.materiais || [];
                maoDeObra = dadosImportados.maoDeObra || { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
                custosIndiretosPredefinidos = dadosImportados.custosIndiretosPredefinidos || JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase)); //  Restaura a base
                custosIndiretosAdicionais = dadosImportados.custosIndiretosAdicionais || [];
                produtos = dadosImportados.produtos || [];
                taxaCredito = dadosImportados.taxaCredito || {percentual: 5, incluir: false};
                margemLucroPadrao = dadosImportados.margemLucroPadrao || 50;


                salvarDados();  // <-- Importante! Salva após importar.

                const match = nomeArquivo.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
                if (match) {
                    const [, ano, mes, dia, hora, minuto] = match;
                    const dataArquivo = new Date(`${ano}-${mes}-${dia}T${hora}:${minuto}`);
                    // Removido: localStorage.setItem('ultimoBackup', ...);  A importação NÃO é um backup.
                }

                alert('Dados importados com sucesso!');

                // --- ATUALIZAÇÃO APÓS IMPORTAR ---
                carregarCustosIndiretosPredefinidos();
                atualizarTabelaMateriaisInsumos();
                atualizarTabelaCustosIndiretos();
                atualizarTabelaProdutosCadastrados();
                atualizarPainelUltimoBackup();

                // --- RECARREGAR VALORES NOS CAMPOS (MÃO DE OBRA) ---
                document.getElementById('salario-receber').value = maoDeObra.salario;
                document.getElementById('horas-trabalhadas').value = maoDeObra.horas;
                document.getElementById('valor-hora').value = maoDeObra.valorHora.toFixed(2);
                document.getElementById('custo-ferias-13o').value = maoDeObra.custoFerias13o.toFixed(2);
                document.getElementById('incluir-ferias-13o-sim').checked = maoDeObra.incluirFerias13o;
                document.getElementById('incluir-ferias-13o-nao').checked = !maoDeObra.incluirFerias13o;

                // --- RECARREGAR VALORES NOS CAMPOS (CÁLCULO) ---
                document.getElementById('margem-lucro-final').value = margemLucroPadrao;
                document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;
                document.getElementById('incluir-taxa-credito-sim').checked = taxaCredito.incluir;
                document.getElementById('incluir-taxa-credito-nao').checked = !taxaCredito.incluir;


                // --- MODO EDIÇÃO (MÃO DE OBRA) ---
                if (modoEdicaoMaoDeObra) {
                    document.getElementById('btn-salvar-mao-de-obra').style.display = 'none';
                    document.getElementById('btn-editar-mao-de-obra').style.display = 'inline-block';
                    document.getElementById('salario-receber').readOnly = true;
                    document.getElementById('horas-trabalhadas').readOnly = true;
                } else {
                    document.getElementById('btn-salvar-mao-de-obra').style.display = 'inline-block';
                    document.getElementById('btn-editar-mao-de-obra').style.display = 'none';
                    document.getElementById('salario-receber').readOnly = false;
                    document.getElementById('horas-trabalhadas').readOnly = false;
                }

                calcularCustos(); // <--  Recalcula tudo após importar e atualizar campos

                mostrarSubMenu('calculo-precificacao'); //  Volta para a seção de cálculo


            } catch (erro) {
                alert('Erro ao importar dados: ' + erro.message);
            }
        };

        leitor.readAsText(arquivo);
    } else {
        alert('Selecione um arquivo para importar.');
    }
}


function salvarDados() {
    localStorage.setItem('materiaisPrecificacao', JSON.stringify(materiais));
    localStorage.setItem('maoDeObraPrecificacao', JSON.stringify(maoDeObra));
    localStorage.setItem('custosIndiretosPredefinidosPrecificacao', JSON.stringify(custosIndiretosPredefinidos));
    localStorage.setItem('custosIndiretosAdicionaisPrecificacao', JSON.stringify(custosIndiretosAdicionais));
    localStorage.setItem('produtosPrecificacao', JSON.stringify(produtos));
    localStorage.setItem('taxaCreditoPrecificacao', JSON.stringify(taxaCredito)); // Salva taxaCredito
    localStorage.setItem('margemLucroPadraoPrecificacao', JSON.stringify(margemLucroPadrao)); // Salva margemLucro

}

function carregarDados() {
    materiais = JSON.parse(localStorage.getItem('materiaisPrecificacao')) || [];
    maoDeObra = JSON.parse(localStorage.getItem('maoDeObraPrecificacao')) || { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
    custosIndiretosPredefinidos = JSON.parse(localStorage.getItem('custosIndiretosPredefinidosPrecificacao')) || JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase)); // Restaura valores base
    custosIndiretosAdicionais = JSON.parse(localStorage.getItem('custosIndiretosAdicionaisPrecificacao')) || [];
    produtos = JSON.parse(localStorage.getItem('produtosPrecificacao')) || [];
     // CARREGA TAXA DE CRÉDITO E MARGEM DE LUCRO
    taxaCredito = JSON.parse(localStorage.getItem('taxaCreditoPrecificacao')) || {percentual: 5, incluir: false};
    margemLucroPadrao = JSON.parse(localStorage.getItem('margemLucroPadraoPrecificacao')) || 50;


    // Verifica se os dados de mão de obra foram carregados e se o modo de edição deve ser ativado
    const maoDeObraSalva = JSON.parse(localStorage.getItem('maoDeObraPrecificacao'));
    if (maoDeObraSalva && maoDeObraSalva.salario !== undefined) {
        modoEdicaoMaoDeObra = true;
    }
}

function atualizarPainelUltimoBackup() {
    const ultimoBackup = JSON.parse(localStorage.getItem('ultimoBackup'));
    const painel = document.getElementById('ultimoBackup');

    if (ultimoBackup) {
        const data = new Date(ultimoBackup.data);
        const dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;

        painel.innerHTML = `Último backup: ${dataFormatada}`;
    } else {
        painel.innerHTML = 'Nenhum backup encontrado';
    }
}

function limparPagina() {
    if (confirm("Tem certeza que deseja limpar todos os dados? Esta ação é irreversível.")) {
        localStorage.removeItem('materiaisPrecificacao');
        localStorage.removeItem('maoDeObraPrecificacao');
        localStorage.removeItem('custosIndiretosPredefinidosPrecificacao');
        localStorage.removeItem('custosIndiretosAdicionaisPrecificacao');
        localStorage.removeItem('produtosPrecificacao');
        localStorage.removeItem('ultimoBackup');  //  <--  ADICIONADO
        localStorage.removeItem('taxaCreditoPrecificacao'); // Remove taxaCredito
        localStorage.removeItem('margemLucroPadraoPrecificacao'); // Remove margemLucro


        // Resetar as variáveis
        materiais = [];
        maoDeObra = { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
        custosIndiretosPredefinidos = JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase)); // Reset para valores base
        custosIndiretosAdicionais = [];
        produtos = [];
        modoEdicaoMaoDeObra = false; // Reset do modo de edição
        novoCustoIndiretoCounter = 0;
        taxaCredito = {percentual: 5, incluir: false}; // Reset da taxa
        margemLucroPadrao = 50; //Reset Margem de Lucro.

        // Limpar as tabelas e formulários
        atualizarTabelaMateriaisInsumos();
        atualizarTabelaCustosIndiretos();
        atualizarTabelaProdutosCadastrados();
        carregarCustosIndiretosPredefinidos(); // Recarrega a lista de custos indiretos (vazia)

        // Limpar campos de formulário específicos
        limparFormulario('form-materiais-insumos');
        limparFormulario('form-mao-de-obra');
        limparFormulario('form-produtos-cadastrados');
        document.querySelector('#tabela-materiais-produto tbody').innerHTML = ''; // Limpa tabela de materiais do produto

        // Resetar campos de mão de obra
        document.getElementById('salario-receber').value = '';
        document.getElementById('horas-trabalhadas').value = '220';
        document.getElementById('valor-hora').value = '';
        document.getElementById('custo-ferias-13o').value = '0.00';
        document.getElementById('incluir-ferias-13o-nao').checked = true;
        document.getElementById('incluir-ferias-13o-sim').checked = false;

         // Resetar campos de cálculo
         document.getElementById('produto-pesquisa').value = '';
         document.getElementById('horas-produto').value = '1';
         document.getElementById('custo-produto').textContent = 'R$ 0,00';
         document.getElementById('custo-mao-de-obra-detalhe').textContent = 'R$ 0,00';
         document.getElementById('custo-ferias-13o-detalhe').textContent = 'R$ 0,00';
         document.getElementById('total-mao-de-obra').textContent = 'R$ 0,00';
         document.getElementById('custo-indireto').textContent = 'R$ 0,00';
         document.getElementById('subtotal').textContent = 'R$ 0,00';
         document.getElementById('margem-lucro-valor').textContent = 'R$ 0,00';
         document.getElementById('margem-lucro-final').value = '0';
         document.getElementById('total-final').textContent = 'R$ 0,00';
         document.getElementById('taxa-credito-valor').textContent = 'R$ 0,00';
         document.getElementById('incluir-taxa-credito-nao').checked = true;
         document.getElementById('incluir-taxa-credito-sim').checked = false;
         document.getElementById('taxa-credito-percentual').value = '6.00';
         document.getElementById('total-final-com-taxas').textContent = 'R$ 0,00';
         document.getElementById('detalhes-produto').style.display = 'none';
         document.getElementById('lista-materiais-produto').innerHTML = '';
         document.getElementById('lista-custos-indiretos-detalhes').innerHTML = '';


        // Resetar estado dos botões (mão de obra)
        document.getElementById('btn-salvar-mao-de-obra').style.display = 'inline-block';
        document.getElementById('btn-editar-mao-de-obra').style.display = 'none';
        document.getElementById('salario-receber').readOnly = false;
        document.getElementById('horas-trabalhadas').readOnly = false;

        atualizarPainelUltimoBackup();  //  <--  Já estava aqui, mas agora vai zerar o painel.
        alert('Todos os dados foram apagados.');

        mostrarSubMenu('calculo-precificacao'); // <--  Volta para alguma seção.  Escolha a que preferir.
    }
}
/* ==== FIM SEÇÃO - IMPORTAR/EXPORTAR/LIMPAR ==== */
