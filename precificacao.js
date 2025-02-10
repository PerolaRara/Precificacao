/* ==== INÍCIO SEÇÃO - VARIÁVEIS GLOBAIS ==== */
let materiais = [];
let maoDeObra = { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
let custosIndiretosPredefinidosBase = [
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
let custosIndiretosPredefinidos = JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase));
let custosIndiretosAdicionais = [];
let produtos = [];
let modoEdicaoMaoDeObra = false;
let itemEdicaoCustoIndireto = null;
let novoCustoIndiretoCounter = 0;
let taxaCredito = { percentual: 5, incluir: false };
let margemLucroPadrao = 50;
let precificacoesGeradas = [];
let proximoNumeroPrecificacao = 1;
let produtoEmEdicao = null;

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
        margemLucroPadrao,
        precificacoesGeradas,
        proximoNumeroPrecificacao
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

    localStorage.setItem('ultimoBackup', JSON.stringify({ nomeArquivo, data: agora.toISOString() }));

    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    atualizarPainelUltimoBackup();
}
/* ==== FIM SEÇÃO - FUNÇÃO DE BACKUP AUTOMÁTICO ==== */

/* ==== INÍCIO SEÇÃO - FUNÇÕES AUXILIARES ==== */
function formatarMoeda(valor) {
    if (typeof valor !== 'number') {
        return 'R$ 0,00';
    }
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mostrarSubMenu(submenuId) {
    const conteudos = ['materiais-insumos', 'mao-de-obra', 'custos-indiretos', 'produtos-cadastrados', 'calculo-precificacao', 'precificacoes-geradas', 'importar-exportar'];
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

function limparFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}

function calcularCustoTotalItem(item) {
    let custoTotal = 0;
    if (item.tipo === "comprimento") {
        custoTotal = item.material.custoUnitario * (item.comprimento / 100);
    } else if (item.tipo === "area") {
        custoTotal = item.material.custoUnitario * (item.largura * item.altura / 10000);
    } else if (item.tipo === "litro") {
        custoTotal = item.material.custoUnitario * (item.volume / 1000);
    } else if (item.tipo === "quilo") {
        custoTotal = item.material.custoUnitario * (item.peso / 1000);
    } else if (item.tipo === "unidade") {
        custoTotal = item.material.custoUnitario * item.quantidade;
    }
    return custoTotal;
}
/* ==== FIM SEÇÃO - FUNÇÕES AUXILIARES ==== */

/* ==== INÍCIO SEÇÃO - EVENT LISTENERS GLOBAIS ==== */
document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('input[name="tipo-material"]').forEach(radio => {
        radio.addEventListener('change', function () {
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

    carregarDados();
    carregarCustosIndiretosPredefinidos();
    atualizarTabelaMateriaisInsumos();
    atualizarTabelaCustosIndiretos();
    atualizarTabelaProdutosCadastrados();
    atualizarTabelaPrecificacoesGeradas();
    atualizarPainelUltimoBackup();

    mostrarSubMenu('calculo-precificacao');

    document.getElementById('margem-lucro-final').value = margemLucroPadrao;
    document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;

    if (taxaCredito.incluir) {
        document.getElementById('incluir-taxa-credito-sim').checked = true;
    } else {
        document.getElementById('incluir-taxa-credito-nao').checked = true;
    }

    calcularCustos();
    salvarTaxaCredito();


    document.addEventListener('click', function (event) {
        const autocompleteDiv = document.getElementById('produto-resultados');
        const inputPesquisa = document.getElementById('produto-pesquisa');

        if (event.target !== autocompleteDiv && event.target !== inputPesquisa) {
            autocompleteDiv.classList.add('hidden');
        }
    });

    document.getElementById('produto-pesquisa').addEventListener('input', buscarProdutosAutocomplete);
});
/* ==== FIM SEÇÃO - EVENT LISTENERS GLOBAIS ==== */

/* ==== INÍCIO SEÇÃO - CÁLCULO DO CUSTO UNITÁRIO ==== */
function calcularCustoUnitario(tipo, valorTotal, comprimentoCm, volumeMl, pesoG, larguraCm, alturaCm) {
    let custoUnitario = 0;
    switch (tipo) {
        case "comprimento":
            custoUnitario = valorTotal / (comprimentoCm / 100);
            break;
        case "litro":
            custoUnitario = valorTotal / (volumeMl / 1000);
            break;
        case "quilo":
            custoUnitario = valorTotal / (pesoG / 1000);
            break;
        case "unidade":
            custoUnitario = valorTotal;
            break;
        case "area":
            custoUnitario = valorTotal / ((larguraCm / 100) * (alturaCm / 100));
            break;
    }
    return custoUnitario;
}
/* ==== FIM SEÇÃO - CÁLCULO DO CUSTO UNITÁRIO ==== */

/* ==== INÍCIO SEÇÃO - CADASTRO DE MATERIAL/INSUMO ==== */
function cadastrarMaterialInsumo() {
    const nome = document.getElementById('nome-material').value;
    const tipo = document.querySelector('input[name="tipo-material"]:checked').value;
    const valorTotal = parseFloat(document.getElementById('valor-total-material').value);
    const comprimentoCm = (tipo === 'comprimento') ? parseFloat(document.getElementById('comprimento-cm').value) : 0;
    const volumeMl = (tipo === 'litro') ? parseFloat(document.getElementById('volume-ml').value) : 0;
    const pesoG = (tipo === 'quilo') ? parseFloat(document.getElementById('peso-g').value) : 0;
    const larguraCm = (tipo === 'area') ? parseFloat(document.getElementById('largura-cm').value) : 0;
    const alturaCm = (tipo === 'area') ? parseFloat(document.getElementById('altura-cm').value) : 0;

    const custoUnitario = calcularCustoUnitario(tipo, valorTotal, comprimentoCm, volumeMl, pesoG, larguraCm, alturaCm);

    const material = {
        nome,
        tipo,
        valorTotal,
        comprimentoCm,
        volumeMl,
        pesoG,
        larguraCm,
        alturaCm,
        custoUnitario
    };

    materiais.push(material);
    atualizarTabelaMateriaisInsumos();
    limparFormulario('form-materiais-insumos');

    const produtosImpactados = produtos.filter(produto =>
        produto.materiais.some(item => item.material.nome === material.nome)
    );

    produtosImpactados.forEach(produto => {
        produto.materiais.forEach(item => {
            if (item.material.nome === material.nome && item.tipo === material.tipo) {
                item.material.custoUnitario = material.custoUnitario;
                item.custoTotal = calcularCustoTotalItem(item);
            }
        });
        produto.custoTotal = produto.materiais.reduce((total, item) => total + item.custoTotal, 0);
    });

    salvarDados();
    atualizarTabelaProdutosCadastrados();
    backupAutomatico(); // Backup automático ao cadastrar material

    const produtoSelecionadoNome = document.getElementById('produto-pesquisa').value;
    if(produtoSelecionadoNome){
        const produtoSelecionado = produtos.find(p => p.nome === produtoSelecionadoNome);
        if(produtoSelecionado){
            carregarDadosProduto(produtoSelecionado);
            calcularCustos();
        }
    }
}
/* ==== FIM SEÇÃO - CADASTRO DE MATERIAL/INSUMO ==== */

/* ==== INÍCIO SEÇÃO - TABELA DE MATERIAL/INSUMO ==== */
function atualizarTabelaMateriaisInsumos() {
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    tbody.innerHTML = '';

    materiais.forEach((material, index) => {
        const row = tbody.insertRow();

        row.insertCell().textContent = material.nome;
        row.insertCell().textContent = material.tipo;

        let dimensoes = '';
        switch (material.tipo) {
            case 'comprimento':
                dimensoes = `${material.comprimentoCm} cm`;
                break;
            case 'litro':
                dimensoes = `${material.volumeMl} ml`;
                break;
            case 'quilo':
                dimensoes = `${material.pesoG} g`;
                break;
            case 'unidade':
                dimensoes = 'N/A';
                break;
            case 'area':
                dimensoes = `${material.larguraCm} x ${material.alturaCm} cm`;
                break;
        }
        row.insertCell().textContent = dimensoes;
        row.insertCell().textContent = formatarMoeda(material.custoUnitario);

        const cellAcoes = row.insertCell();
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.onclick = () => editarMaterialInsumo(index);
        const btnRemover = document.createElement('button');
        btnRemover.textContent = 'Remover';
        btnRemover.onclick = () => removerMaterialInsumo(index);
        cellAcoes.appendChild(btnEditar);
        cellAcoes.appendChild(btnRemover);
    });
}


function buscarMateriaisCadastrados() {
    const termoBusca = document.getElementById('busca-material').value.toLowerCase();
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    tbody.innerHTML = '';

    materiais.filter(material => material.nome.toLowerCase().includes(termoBusca)).forEach((material, index) => {
        const row = tbody.insertRow();

        row.insertCell().textContent = material.nome;
        row.insertCell().textContent = material.tipo;

        let dimensoes = '';
            switch (material.tipo) {
                case 'comprimento':
                    dimensoes = `${material.comprimentoCm} cm`;
                    break;
                case 'litro':
                    dimensoes = `${material.volumeMl} ml`;
                    break;
                case 'quilo':
                    dimensoes = `${material.pesoG} g`;
                    break;
                case 'unidade':
                    dimensoes = 'N/A';
                    break;
                case 'area':
                    dimensoes = `${material.larguraCm} x ${material.alturaCm} cm`;
                    break;
            }
        row.insertCell().textContent = dimensoes;
        row.insertCell().textContent = formatarMoeda(material.custoUnitario);

        const cellAcoes = row.insertCell();
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.onclick = () => editarMaterialInsumo(index);
        const btnRemover = document.createElement('button');
        btnRemover.textContent = 'Remover';
        btnRemover.onclick = () => removerMaterialInsumo(index);
        cellAcoes.appendChild(btnEditar);
        cellAcoes.appendChild(btnRemover);
    });
}


function editarMaterialInsumo(index) {
    const material = materiais[index];

    document.getElementById('nome-material').value = material.nome;
    document.querySelector(`input[name="tipo-material"][value="${material.tipo}"]`).checked = true;
    document.getElementById('valor-total-material').value = material.valorTotal;

    document.querySelectorAll('.form-group[id^="campos-"]').forEach(el => el.style.display = 'none');
    if (material.tipo === 'comprimento') {
        document.getElementById('campos-comprimento').style.display = 'block';
        document.getElementById('comprimento-cm').value = material.comprimentoCm;
    } else if (material.tipo === 'litro') {
        document.getElementById('campos-litro').style.display = 'block';
        document.getElementById('volume-ml').value = material.volumeMl;
    } else if (material.tipo === 'quilo') {
        document.getElementById('campos-quilo').style.display = 'block';
        document.getElementById('peso-g').value = material.pesoG;
    } else if (material.tipo === 'area') {
        document.getElementById('campos-area').style.display = 'block';
        document.getElementById('largura-cm').value = material.larguraCm;
        document.getElementById('altura-cm').value = material.alturaCm;
    }

     removerMaterialInsumo(index);
}

function removerMaterialInsumo(index) {
    materiais.splice(index, 1);
    atualizarTabelaMateriaisInsumos();
     salvarDados();
}
/* ==== FIM SEÇÃO - TABELA DE MATERIAL/INSUMO ==== */

/* ==== INÍCIO SEÇÃO - MÃO DE OBRA ==== */
// --- Mão de Obra ---
function calcularValorHora() {
    // Idea 1 & 2: Simpler calculation and direct value setting, anonymous event listeners
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
     // Idea 1 & 2: Simpler calculation and direct value setting, anonymous event listeners
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
    maoDeObra.valorHora = calcularValorHora();
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

     atualizarTabelaCustosIndiretos();
     calcularCustos();

     salvarDados();
}

function editarMaoDeObra() {
    modoEdicaoMaoDeObra = false;

    document.getElementById('salario-receber').readOnly = false;
    document.getElementById('horas-trabalhadas').readOnly = false;

    document.getElementById('btn-editar-mao-de-obra').style.display = 'none';
    document.getElementById('btn-salvar-mao-de-obra').style.display = 'inline-block';

    document.getElementById('mao-de-obra').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('titulo-mao-de-obra').textContent = 'Informações sobre custo de mão de obra';
}

// Idea 2: Simplified Event Listeners (Anonymous functions, direct calls)
document.getElementById('salario-receber').addEventListener('input', function(){
    calcularValorHora();
    calcularCustoFerias13o();
});
document.getElementById('horas-trabalhadas').addEventListener('input', function(){
    calcularValorHora();
    calcularCustoFerias13o();
    atualizarTabelaCustosIndiretos();
    calcularCustos();
});
/* ==== FIM SEÇÃO - MÃO DE OBRA ==== */

/* ==== INÍCIO SEÇÃO - CUSTOS INDIRETOS ==== */
function carregarCustosIndiretosPredefinidos() {
    const listaCustos = document.getElementById('lista-custos-indiretos');
    listaCustos.innerHTML = '';

    custosIndiretosPredefinidosBase.forEach((custoBase, index) => {
        const listItem = document.createElement('li');
        const custoAtual = custosIndiretosPredefinidos.find(c => c.descricao === custoBase.descricao) || { ...custoBase };
        listItem.innerHTML = `
            <div class="custo-item-nome">${custoBase.descricao}</div>
            <input type="number" id="custo-indireto-${index}" value="${custoAtual.valorMensal.toFixed(2)}" step="0.01">
            <button onclick="salvarCustoIndiretoPredefinido(${index})">Salvar</button>
        `;
        listaCustos.appendChild(listItem);
    });

    custosIndiretosAdicionais.forEach((custo) => {
        const listItem = document.createElement('li');
        listItem.dataset.index = custo.tempIndex;
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
    const descricao = custosIndiretosPredefinidosBase[index].descricao;

    if (!isNaN(novoValor)) {
        const custoParaAtualizar = custosIndiretosPredefinidos.find(c => c.descricao === descricao);
        if(custoParaAtualizar){
            custoParaAtualizar.valorMensal = novoValor;
        }
        atualizarTabelaCustosIndiretos();
        calcularCustos();
        salvarDados();
    } else {
        alert("Por favor, insira um valor numérico válido.");
    }
}

function adicionarNovoCustoIndireto() {
    const listaCustos = document.getElementById('lista-custos-indiretos');
    const listItem = document.createElement('li');
    const id = `novo-custo-${novoCustoIndiretoCounter++}`;
    listItem.dataset.index = id;
    listItem.innerHTML = `
        <input type="text" class="custo-item-nome" placeholder="Descrição do novo custo">
        <input type="number" value="0.00" step="0.01">
        <button onclick="salvarNovoCustoIndiretoLista(this)" data-index="${id}">Salvar</button>
        <button onclick="removerNovoCustoIndiretoLista(this)" data-index="${id}">Remover</button>
    `;
    listaCustos.appendChild(listItem);
}

function salvarNovoCustoIndiretoLista(botao) {
    const listItem = botao.parentNode;
    const descricaoInput = listItem.querySelector('.custo-item-nome');
    const valorInput = listItem.querySelector('input[type="number"]');
    const index = botao.dataset.index;

    const descricao = descricaoInput.value.trim();
    const valorMensal = parseFloat(valorInput.value);

    if (descricao && !isNaN(valorMensal)) {
        const custoExistenteIndex = custosIndiretosAdicionais.findIndex(c => c.tempIndex === index);

        if (custoExistenteIndex !== -1) {
            custosIndiretosAdicionais[custoExistenteIndex] = { descricao: descricao, valorMensal: valorMensal, tempIndex: index };
        } else {
            custosIndiretosAdicionais.push({ descricao: descricao, valorMensal: valorMensal, tempIndex: index });
        }
        atualizarTabelaCustosIndiretos();
        calcularCustos();
        salvarDados();

    } else {
        alert("Por favor, preencha a descrição e insira um valor numérico válido.");
    }
}

function removerNovoCustoIndiretoLista(botaoRemover) {
    const listItem = botaoRemover.parentNode;
    const indexToRemove = botaoRemover.dataset.index;

    custosIndiretosAdicionais = custosIndiretosAdicionais.filter(custo => custo.tempIndex !== indexToRemove);
    listItem.remove();
    atualizarTabelaCustosIndiretos();
    calcularCustos();
    salvarDados();
}

function atualizarTabelaCustosIndiretos() {
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

    const custosPredefinidosParaExibir = custosIndiretosPredefinidos.filter(custo => custo.valorMensal > 0);
    const custosAdicionaisParaExibir = custosIndiretosAdicionais.filter(custo => custo.valorMensal > 0);

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

        const botaoZerar = document.createElement('button');
        botaoZerar.textContent = 'Zerar';
        botaoZerar.onclick = () => zerarCustoIndireto(index, 'predefinido');
        cellAcoes.appendChild(botaoZerar);
    });

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

        const botaoZerar = document.createElement('button');
        botaoZerar.textContent = 'Zerar';
        botaoZerar.onclick = () => zerarCustoIndireto(custo.tempIndex, 'adicional');
        cellAcoes.appendChild(botaoZerar);
    });
}

function zerarCustoIndireto(indexOuTempIndex, tipo) {
    if (tipo === 'predefinido') {
        custosIndiretosPredefinidos[indexOuTempIndex].valorMensal = 0;
        document.getElementById(`custo-indireto-${indexOuTempIndex}`).value = '0.00';
    } else if (tipo === 'adicional') {
        const custoAdicionalIndex = custosIndiretosAdicionais.findIndex(c => c.tempIndex === indexOuTempIndex);
        if (custoAdicionalIndex !== -1) {
            custosIndiretosAdicionais[custoAdicionalIndex].valorMensal = 0;
        }
    }
    atualizarTabelaCustosIndiretos();
    calcularCustos();
    salvarDados();
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

            let botaoAcao;
            if (originalIndexPredefinidos !== -1) {
                botaoAcao = document.createElement('button');
                botaoAcao.textContent = 'Zerar';
                botaoAcao.onclick = function() { zerarCustoIndireto(originalIndexPredefinidos, 'predefinido'); };
            } else if (originalAdicional) {
                botaoAcao = document.createElement('button');
                botaoAcao.textContent = 'Zerar';
                botaoAcao.onclick = function() { zerarCustoIndireto(custo.tempIndex, 'adicional'); };
            }

            cellAcoes.appendChild(botaoAcao);
        }
    });
}

/* ==== FIM SEÇÃO - CUSTOS INDIRETOS ==== */

/* ==== INÍCIO SEÇÃO - PRODUTOS CADASTRADOS ==== */
function cadastrarProduto() {
    const nomeProduto = document.getElementById('nome-produto').value;
    if (!nomeProduto) {
        alert('Por favor, insira um nome para o produto.');
        return;
    }

    // Coleta os materiais da tabela
    const materiaisProduto = [];
    const linhasTabela = document.querySelectorAll('#tabela-materiais-produto tbody tr');
    linhasTabela.forEach(linha => {
        let nomeMaterial = linha.cells[0].textContent;
        const tipoMaterial = linha.cells[1].textContent;
        const custoUnitario = parseFloat(linha.cells[2].textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'));

        // Recupera os valores das dimensões/quantidades
        let comprimento, largura, altura, volume, peso, quantidade;
        if (tipoMaterial === "comprimento") {
            comprimento = parseFloat(linha.querySelector('.dimensoes-input').value);
        } else if (tipoMaterial === "area") {
            largura = parseFloat(linha.querySelectorAll('.dimensoes-input')[0].value);
            altura = parseFloat(linha.querySelectorAll('.dimensoes-input')[1].value);
        } else if (tipoMaterial === "litro") {
            volume = parseFloat(linha.querySelector('.dimensoes-input').value);
        } else if (tipoMaterial === "quilo") {
            peso = parseFloat(linha.querySelector('.dimensoes-input').value);
        } else if (tipoMaterial === "unidade") {
            quantidade = parseFloat(linha.querySelector('.dimensoes-input').value);
        }

        quantidade = parseFloat(linha.querySelector('.quantidade-input').value);

        // Encontra o material original
        const materialOriginal = materiais.find(m => m.nome === nomeMaterial);

        // Cria o objeto 'item'
        const item = {
            material: {
                nome: materialOriginal.nome,
                custoUnitario: materialOriginal.custoUnitario
            },
            tipo: tipoMaterial,
            comprimento,
            largura,
            altura,
            volume,
            peso,
            quantidade,
        };

        // Calcula o custo total do item
        item.custoTotal = calcularCustoTotalItem(item);

        materiaisProduto.push(item);
    });

    // Calcula o custo total do produto
    const custoTotalProduto = materiaisProduto.reduce((total, item) => total + item.custoTotal, 0);

    // Cria ou atualiza o produto
    if (produtoEmEdicao !== null) {
        produtos[produtoEmEdicao] = {
            nome: nomeProduto,
            materiais: materiaisProduto,
            custoTotal: custoTotalProduto
        };
    } else {
        produtos.push({
            nome: nomeProduto,
            materiais: materiaisProduto,
            custoTotal: custoTotalProduto
        });
    }

    // Limpa o formulário e a tabela
    document.getElementById('form-produtos-cadastrados').reset();
    document.querySelector('#tabela-materiais-produto tbody').innerHTML = '';

    atualizarTabelaProdutosCadastrados();
    salvarDados();
    produtoEmEdicao = null;
    backupAutomatico(); // Backup automático ao cadastrar produto
}
function atualizarTabelaProdutosCadastrados() {
    const tbody = document.querySelector("#tabela-produtos tbody");
    tbody.innerHTML = ""; // Limpa a tabela

    produtos.forEach((produto, index) => {
        const row = tbody.insertRow();

        // Coluna Nome do Produto
        row.insertCell().textContent = produto.nome;

        // Coluna Materiais Utilizados (lista formatada)
        const materiaisCell = row.insertCell();
        const materiaisList = document.createElement("ul");
        produto.materiais.forEach(item => {
            const listItem = document.createElement("li");
            listItem.textContent = `${item.material.nome} (${item.quantidade} ${item.tipo})`;
            materiaisList.appendChild(listItem);
        });
        materiaisCell.appendChild(materiaisList);

        // *** NOVO CAMPO: Custos/Dimensões do Produto ***
        const dimensoesCell = row.insertCell();
        const dimensoesList = document.createElement("ul");
        produto.materiais.forEach(item => {
            const listItem = document.createElement("li");
            let dimensaoTexto = "";

            // Formatação das dimensões/quantidades
            if (item.tipo === "comprimento") {
                dimensaoTexto = `${item.comprimento} cm`;
            } else if (item.tipo === "area") {
                dimensaoTexto = `${item.largura} x ${item.altura} cm`;
            } else if (item.tipo === "litro") {
                dimensaoTexto = `${item.volume} ml`;
            } else if (item.tipo === "quilo") {
                dimensaoTexto = `${item.peso} g`;
            } else if (item.tipo === "unidade") {
                dimensaoTexto = `${item.quantidade} un`; // Usa a quantidade diretamente
            }
            listItem.textContent = `${item.material.nome}: ${dimensaoTexto}`;
            dimensoesList.appendChild(listItem);
        });
        dimensoesCell.appendChild(dimensoesList);

        // Coluna Custo Total dos Materiais
        row.insertCell().textContent = formatarMoeda(produto.custoTotal);

        // Coluna Ações (Editar e Remover)
        const actionsCell = row.insertCell();
        const editButton = document.createElement("button");
        editButton.textContent = "Editar";
        editButton.onclick = () => editarProduto(index);
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remover";
        removeButton.onclick = () => removerProduto(index);
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(removeButton);
    });
}


function buscarProdutosCadastrados() {
    const termoBusca = document.getElementById('busca-produto').value.toLowerCase();
    const tbody = document.querySelector('#tabela-produtos tbody');
    tbody.innerHTML = '';

    produtos.filter(produto => produto.nome.toLowerCase().includes(termoBusca)).forEach((produto, index) => {
        const row = tbody.insertRow();

        // Coluna Nome do Produto
        row.insertCell().textContent = produto.nome;

        // Coluna Materiais Utilizados
        const materiaisCell = row.insertCell();
        const materiaisList = document.createElement('ul');
        produto.materiais.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = `${item.material.nome} (${item.quantidade} ${item.material.tipo})`;
            materiaisList.appendChild(listItem);
        });
        materiaisCell.appendChild(materiaisList);

         // *** NOVO CAMPO: Custos/Dimensões do Produto ***
        const dimensoesCell = row.insertCell();
        const dimensoesList = document.createElement("ul");
        produto.materiais.forEach(item => {
            const listItem = document.createElement("li");
            let dimensaoTexto = "";

            // Formatação das dimensões/quantidades
            if (item.tipo === "comprimento") {
                dimensaoTexto = `${item.comprimento} cm`;
            } else if (item.tipo === "area") {
                dimensaoTexto = `${item.largura} x ${item.altura} cm`;
            } else if (item.tipo === "litro") {
                dimensaoTexto = `${item.volume} ml`;
            } else if (item.tipo === "quilo") {
                dimensaoTexto = `${item.peso} g`;
            } else if (item.tipo === "unidade") {
                dimensaoTexto = `${item.quantidade} un`;  // Usa quantidade para unidades.
            }
            listItem.textContent = `${item.material.nome}: ${dimensaoTexto}`;
            dimensoesList.appendChild(listItem);
        });
        dimensoesCell.appendChild(dimensoesList);

        // Coluna Custo Total
        row.insertCell().textContent = formatarMoeda(produto.custoTotal);

        // Coluna Ações
        const actionsCell = row.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = 'Editar';
        editButton.onclick = () => editarProduto(index);
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remover';
        removeButton.onclick = () => removerProduto(index);
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(removeButton);
    });
}


function adicionarMaterialNaTabelaProduto(material, tipo, quantidade, comprimento, largura, altura, volume, peso) {
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    const row = tbody.insertRow();

    // Coluna Material/Insumo
    row.insertCell().textContent = material.nome;

    // Coluna Tipo
    row.insertCell().textContent = tipo;

    // Coluna Custo Unitário
    row.insertCell().textContent = formatarMoeda(material.custoUnitario);

    // Coluna Dimensões (inputs, preenchidos com os valores passados)
    const dimensoesCell = row.insertCell();
    let dimensoesHTML = "";

    if (tipo === "comprimento") {
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${comprimento}"> cm`;
    } else if (tipo === "area") {
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${largura}"> x <input type="number" class="dimensoes-input" value="${altura}"> cm`;
    } else if (tipo === "litro") {
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${volume}"> ml`;
    } else if (tipo === "quilo") {
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${peso}"> g`;
    } else if (tipo === "unidade") {
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${quantidade}"> un`;
    }
    dimensoesCell.innerHTML = dimensoesHTML;


    // Coluna Quantidade (Calculada, readonly)
    const quantidadeCell = row.insertCell();
    const quantidadeInput = document.createElement("input");
    quantidadeInput.type = "number";
    quantidadeInput.classList.add("quantidade-input"); // Adiciona a classe
    quantidadeInput.value = quantidade;
    quantidadeInput.readOnly = true;
    quantidadeCell.appendChild(quantidadeInput);

    // --- Cria o objeto item para usar na função de cálculo ---
    const item = {
      material: {
          nome: material.nome,
          custoUnitario: material.custoUnitario
      },
      tipo: tipo,
      comprimento,
      largura,
      altura,
      volume,
      peso,
      quantidade
    }

    // Coluna Custo Total (Calculado)
    const custoTotal = calcularCustoTotalItem(item); // Chamada da função
    row.insertCell().textContent = formatarMoeda(custoTotal);

    // Coluna Ações (Remover)
    const actionsCell = row.insertCell();
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remover";
    removeButton.onclick = () => removerLinhaMaterial(tbody.rows.length -1); // Passa o índice correto.
    actionsCell.appendChild(removeButton);

     // Limpa o campo de pesquisa
     document.getElementById('pesquisa-material').value = '';
     document.getElementById('resultados-pesquisa').innerHTML = '';
     document.getElementById('resultados-pesquisa').style.display = 'none';
}



// Função de pesquisa (para o autocomplete)
document.getElementById('pesquisa-material').addEventListener('input', function() {
    const termo = this.value.toLowerCase();
    const resultadosDiv = document.getElementById('resultados-pesquisa');
    resultadosDiv.innerHTML = '';

    if (termo.length === 0) {
        resultadosDiv.style.display = 'none';
        return;
    }

    const resultados = materiais.filter(material => material.nome.toLowerCase().includes(termo));

    if (resultados.length > 0) {
        resultadosDiv.style.display = 'block';
        resultados.forEach(material => {
            const div = document.createElement('div');
            div.textContent = material.nome;
            div.onclick = () => {
                // Ao clicar, adiciona o material na tabela
                const tipo = material.tipo;
                let quantidade, comprimento, largura, altura, volume, peso;

                if (tipo === "comprimento") {
                    comprimento = parseFloat(prompt("Informe o comprimento em cm:", material.comprimentoCm));
                    if(isNaN(comprimento)) return;
                    quantidade = comprimento / material.comprimentoCm;

                } else if (tipo === "area") {
                    largura = parseFloat(prompt("Informe a largura em cm:", material.larguraCm));
                    if(isNaN(largura)) return;
                    altura = parseFloat(prompt("Informe a altura em cm:", material.alturaCm));
                    if(isNaN(altura)) return;
                    quantidade = (largura * altura) / (material.larguraCm * material.alturaCm);

                } else if (tipo === "litro") {
                    volume = parseFloat(prompt("Informe o volume em ml:", material.volumeMl));
                    if(isNaN(volume)) return;
                     quantidade = volume / material.volumeMl;

                } else if (tipo === "quilo") {
                   peso = parseFloat(prompt("Informe o peso em g:", material.pesoG));
                   if(isNaN(peso)) return;
                   quantidade = peso / material.pesoG;

                } else if (tipo === "unidade") {
                  quantidade = parseInt(prompt("Informe a quantidade:", 1)); //Padrão 1 para unidade.
                  if(isNaN(quantidade)) return;
                }
                adicionarMaterialNaTabelaProduto(material, tipo, quantidade, comprimento, largura, altura, volume, peso);
            };
            resultadosDiv.appendChild(div);
        });
    } else {
        resultadosDiv.style.display = 'none';
    }
});

function editarProduto(index) {
    const produto = produtos[index];

    // Limpa a tabela de materiais do produto
    const tbody = document.querySelector("#tabela-materiais-produto tbody");
    tbody.innerHTML = "";

    // Preenche os campos do formulário com os dados do produto
    document.getElementById("nome-produto").value = produto.nome;

    // Preenche a tabela de materiais com os dados do produto
    produto.materiais.forEach((item, itemIndex) => {
        const row = tbody.insertRow();

        // Coluna Material/Insumo
        row.insertCell().textContent = item.material.nome;

        // Coluna Tipo
        row.insertCell().textContent = item.tipo;

        // Coluna Custo Unitário
        row.insertCell().textContent = formatarMoeda(item.material.custoUnitario);

        // Coluna Dimensões (inputs)
        const dimensoesCell = row.insertCell();
        let dimensoesHTML = "";

        // --- Criação dos inputs e adição dos event listeners ---
        if (item.tipo === "comprimento") {
            dimensoesHTML = `<input type="number" class="dimensoes-input" value="${item.comprimento}"> cm`;
        } else if (item.tipo === "area") {
            dimensoesHTML = `<input type="number" class="dimensoes-input" value="${item.largura}"> x <input type="number" class="dimensoes-input" value="${item.altura}"> cm`;
        } else if (item.tipo === "litro") {
            dimensoesHTML = `<input type="number" class="dimensoes-input" value="${item.volume}"> ml`;
        } else if (item.tipo === "quilo") {
            dimensoesHTML = `<input type="number" class="dimensoes-input" value="${item.peso}"> g`;
        } else if (item.tipo === "unidade") {
            dimensoesHTML = `<input type="number" class="dimensoes-input" value="${item.quantidade}"> un`;
        }
        dimensoesCell.innerHTML = dimensoesHTML;


        // Coluna Quantidade (Calculada)
        const quantidadeCell = row.insertCell();
        const quantidadeInput = document.createElement("input");
        quantidadeInput.type = "number";
        quantidadeInput.classList.add("quantidade-input");
        quantidadeInput.value = item.quantidade;
        quantidadeInput.readOnly = true;
        quantidadeCell.appendChild(quantidadeInput);

        // Coluna Custo Total
        const custoTotalCell = row.insertCell();
        custoTotalCell.textContent = formatarMoeda(item.custoTotal); // Valor inicial


        // --- Adiciona event listeners para recalcular quando as dimensões mudarem ---
        const inputsDimensao = dimensoesCell.querySelectorAll('.dimensoes-input');
        inputsDimensao.forEach(input => {
            input.addEventListener('input', () => {
                // Encontra o material original (necessário para obter as dimensões base)
                const materialOriginal = materiais.find(m => m.nome === item.material.nome && m.tipo === item.tipo); //Importante comparar nome *E* tipo.

                // Atualiza os valores no objeto 'item'
                if (item.tipo === "comprimento") {
                    item.comprimento = parseFloat(inputsDimensao[0].value) || 0; //Evita NaN
                    item.quantidade = item.comprimento / materialOriginal.comprimentoCm;
                } else if (item.tipo === "area") {
                    item.largura = parseFloat(inputsDimensao[0].value) || 0;
                    item.altura = parseFloat(inputsDimensao[1].value) || 0;
                    item.quantidade = (item.largura * item.altura) / (materialOriginal.larguraCm * materialOriginal.alturaCm);
                } else if (item.tipo === "litro") {
                    item.volume = parseFloat(inputsDimensao[0].value) || 0;
                    item.quantidade = item.volume / materialOriginal.volumeMl;
                } else if (item.tipo === "quilo") {
                    item.peso = parseFloat(inputsDimensao[0].value) || 0;
                    item.quantidade = item.peso / materialOriginal.pesoG;
                } else if (item.tipo === "unidade") {
                    item.quantidade = parseFloat(inputsDimensao[0].value) || 0;
                }

                // Recalcula o custo total do *item*
                item.custoTotal = calcularCustoTotalItem(item);

                // Atualiza a exibição do custo total na tabela
                custoTotalCell.textContent = formatarMoeda(item.custoTotal);
                quantidadeInput.value = item.quantidade;

                // Recalcula o custo total do *produto* (soma de todos os itens)
                produto.custoTotal = produto.materiais.reduce((total, i) => total + i.custoTotal, 0);

                // Atualiza a tabela de produtos cadastrados e a seção de cálculo
                atualizarTabelaProdutosCadastrados();
                if (document.getElementById('produto-pesquisa').value === produto.nome) {
                    carregarDadosProduto(produto); //Recarrega se for o produto exibido
                    calcularCustos();
                }
            });
        });
        // --- Fim da adição dos event listeners ---


        // Coluna Ações (Remover)
        const actionsCell = row.insertCell();
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remover";
        removeButton.onclick = () => removerLinhaMaterial(itemIndex);
        actionsCell.appendChild(removeButton);
    });

    // Armazena o índice do produto sendo editado
    produtoEmEdicao = index;

    // Rola a página para o topo (opcional, para melhor usabilidade)
    window.scrollTo(0, 0);
}

function removerProduto(index) {
    produtos.splice(index, 1);
    atualizarTabelaProdutosCadastrados();
    salvarDados(); // Salva após remover
}

function removerLinhaMaterial(index) {
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    tbody.deleteRow(index);
}

/* ==== FIM SEÇÃO - PRODUTOS CADASTRADOS ==== */

/* ==== INÍCIO SEÇÃO - CÁLCULO DA PRECIFICAÇÃO ==== */
function buscarProdutosAutocomplete() {
    const termo = document.getElementById('produto-pesquisa').value.toLowerCase();
    const resultadosDiv = document.getElementById('produto-resultados');
    resultadosDiv.innerHTML = '';

    if (!termo) {
        resultadosDiv.classList.add('hidden');
        return;
    }

    const resultados = produtos.filter(produto => produto.nome.toLowerCase().includes(termo));

    if (resultados.length > 0) {
        resultadosDiv.classList.remove('hidden');
        resultados.forEach(produto => {
            const div = document.createElement('div');
            div.textContent = produto.nome;
            div.onclick = () => selecionarProduto(produto);
            resultadosDiv.appendChild(div);
        });
    } else {
        resultadosDiv.classList.add('hidden');
    }
}

function selecionarProduto(produto) {
    document.getElementById('produto-pesquisa').value = produto.nome; // Preenche o input
    document.getElementById('produto-resultados').classList.add('hidden'); // Esconde a lista
    carregarDadosProduto(produto);
    calcularCustos(); // Calcula os custos assim que um produto é selecionado
}


function carregarDadosProduto(produto) {

    //Custo do produto
    document.getElementById('custo-produto').textContent = formatarMoeda(produto.custoTotal);

    // Limpa detalhes anteriores
    const listaMateriais = document.getElementById('lista-materiais-produto');
    listaMateriais.innerHTML = '';

    // Preenche a lista de materiais (detalhes)
    produto.materiais.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.material.nome} - ${item.quantidade} ${item.tipo} - ${formatarMoeda(item.custoTotal)}`;
        listaMateriais.appendChild(li);
    });

     // Mostra a seção de detalhes
     document.getElementById('detalhes-produto').style.display = 'block';

}

function calcularCustos() {
    const produtoSelecionadoNome = document.getElementById('produto-pesquisa').value;
    const produtoSelecionado = produtos.find(p => p.nome === produtoSelecionadoNome);

    // Custos do Produto
    const custoProduto = produtoSelecionado ? produtoSelecionado.custoTotal : 0;
    document.getElementById('custo-produto').textContent = formatarMoeda(custoProduto);

    // Custos da Mão de Obra
    const horasProduto = parseFloat(document.getElementById('horas-produto').value) || 0; //Evita NaN
    const custoMaoDeObra = maoDeObra.valorHora * horasProduto;
    const custoFerias13o = maoDeObra.custoFerias13o * horasProduto;
    const totalMaoDeObra = custoMaoDeObra + custoFerias13o;

    document.getElementById('custo-mao-de-obra-detalhe').textContent = formatarMoeda(custoMaoDeObra);
    document.getElementById('custo-ferias-13o-detalhe').textContent = formatarMoeda(custoFerias13o);
    document.getElementById('total-mao-de-obra').textContent = formatarMoeda(totalMaoDeObra);

    // Custos Indiretos
    const todosCustosIndiretos = [...custosIndiretosPredefinidos, ...custosIndiretosAdicionais];
    const custosIndiretosAtivos = todosCustosIndiretos.filter(custo => custo.valorMensal > 0); // MODIFICADO: FILTRA CUSTOS ATIVOS
    const custoIndiretoTotalPorHora = custosIndiretosAtivos.reduce((total, custo) => total + (custo.valorMensal / maoDeObra.horas), 0);
    const custoIndiretoTotal = custoIndiretoTotalPorHora * horasProduto;
    document.getElementById('custo-indireto').textContent = formatarMoeda(custoIndiretoTotal);

    // Lista de Custos Indiretos Detalhados
    const listaCustosIndiretos = document.getElementById('lista-custos-indiretos-detalhes');
    listaCustosIndiretos.innerHTML = ''; // Limpa a lista
    custosIndiretosAtivos.forEach(custo => { // MODIFICADO: USA custosIndiretosAtivos
        const li = document.createElement('li');
        const custoPorHora = custo.valorMensal / maoDeObra.horas;
        const custoTotalItem = custoPorHora * horasProduto;
        li.textContent = `${custo.descricao} - ${formatarMoeda(custoTotalItem)}`;
        listaCustosIndiretos.appendChild(li);
    });

      // Mostra a seção de detalhes dos custos indiretos
      document.getElementById('detalhes-custos-indiretos').style.display = 'block';


    // Subtotal
    const subtotal = custoProduto + totalMaoDeObra + custoIndiretoTotal;
    document.getElementById('subtotal').textContent = formatarMoeda(subtotal);

    // Calcula o preço de venda final (já que o subtotal mudou)
    calcularPrecoVendaFinal();
}

function calcularPrecoVendaFinal() {
    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const margemLucroFinal = parseFloat(document.getElementById('margem-lucro-final').value) || 0;

    const margemLucroValor = subtotal * (margemLucroFinal / 100);
    const totalFinal = subtotal + margemLucroValor;

    document.getElementById('margem-lucro-valor').textContent = formatarMoeda(margemLucroValor); //Mostra o valor
    document.getElementById('total-final').textContent = formatarMoeda(totalFinal);

    calcularTotalComTaxas(); // Calcula o total com taxas, já que o total mudou.
}

function salvarTaxaCredito() {
    taxaCredito.percentual = parseFloat(document.getElementById('taxa-credito-percentual').value);
    taxaCredito.incluir = document.getElementById('incluir-taxa-credito-sim').checked;

     // Dispara o cálculo para atualizar, se necessário.
     calcularTotalComTaxas();

    salvarDados();
}

function calcularTotalComTaxas(){

  const total = parseFloat(document.getElementById('total-final').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;

  if(document.getElementById('incluir-taxa-credito-sim').checked){
    const taxa = total * (taxaCredito.percentual/100);
    const totalComTaxas = total + taxa;
    document.getElementById('taxa-credito-valor').textContent = formatarMoeda(taxa);
    document.getElementById('total-final-com-taxas').textContent = formatarMoeda(totalComTaxas);
  } else{
    document.getElementById('taxa-credito-valor').textContent = formatarMoeda(0);
    document.getElementById('total-final-com-taxas').textContent = formatarMoeda(total); //Mantém o total
  }
}

//Event listeners
document.getElementById('horas-produto').addEventListener('input', calcularCustos);
document.getElementById('margem-lucro-final').addEventListener('input', calcularPrecoVendaFinal);
document.querySelectorAll('input[name="incluir-taxa-credito"]').forEach(radio => {
    radio.addEventListener('change', calcularTotalComTaxas);
});
document.getElementById('taxa-credito-percentual').addEventListener('input', calcularTotalComTaxas);

/* ==== FIM SEÇÃO - CÁLCULO DA PRECIFICAÇÃO ==== */

/* ==== INÍCIO SEÇÃO - PRECIFICAÇÕES GERADAS ==== */
function gerarNotaPrecificacao() {
    const nomeCliente = document.getElementById('nome-cliente').value || "Não informado";
    const produtoNome = document.getElementById('produto-pesquisa').value;
    const horasProduto = parseFloat(document.getElementById('horas-produto').value);
    const margemLucro = parseFloat(document.getElementById('margem-lucro-final').value);
    const totalFinal = parseFloat(document.getElementById('total-final').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'));
    const totalComTaxas = parseFloat(document.getElementById('total-final-com-taxas').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'));

    // *** INÍCIO - Coletando dados detalhados para a nota ***
    const produtoSelecionadoNome = document.getElementById('produto-pesquisa').value;
    const produtoSelecionado = produtos.find(p => p.nome === produtoSelecionadoNome);
    const custoProduto = produtoSelecionado ? produtoSelecionado.custoTotal : 0;

    const custoMaoDeObraDetalhe = parseFloat(document.getElementById('custo-mao-de-obra-detalhe').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const custoFerias13oDetalhe = parseFloat(document.getElementById('custo-ferias-13o-detalhe').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const totalMaoDeObra = parseFloat(document.getElementById('total-mao-de-obra').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;

    const custoIndiretoTotal = parseFloat(document.getElementById('custo-indireto').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const listaCustosIndiretosDetalhes = [];
    const listaCustosIndiretosElementos = document.querySelectorAll('#lista-custos-indiretos-detalhes li');
    listaCustosIndiretosElementos.forEach(itemLi => {
        listaCustosIndiretosDetalhes.push(itemLi.textContent); // Salva a string completa do item
    });

    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const margemLucroValor = parseFloat(document.getElementById('margem-lucro-valor').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const taxaCreditoValor = parseFloat(document.getElementById('taxa-credito-valor').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;

    const detalhesMateriaisProduto = [];
    if (produtoSelecionado) {
        produtoSelecionado.materiais.forEach(item => {
            detalhesMateriaisProduto.push(`${item.material.nome} - ${item.quantidade} ${item.tipo} - ${formatarMoeda(item.custoTotal)}`);
        });
    }
    // *** FIM - Coletando dados detalhados para a nota ***


    // Verifica se todos os dados necessários estão presentes
   if (!produtoNome || isNaN(horasProduto) || isNaN(margemLucro) || isNaN(totalFinal)) {
        alert("Por favor, preencha todos os campos necessários para gerar a nota de precificação.");
        return;
    }

    const agora = new Date();
    const ano = agora.getFullYear();
    const numeroPrecificacao = proximoNumeroPrecificacao++;

    const precificacao = {
        numero: numeroPrecificacao,
        ano: ano,
        cliente: nomeCliente,
        produto: produtoNome,
        horas: horasProduto,
        margem: margemLucro,
        total: totalFinal,
        totalComTaxas: totalComTaxas,

        // *** INÍCIO - Salvando dados detalhados na nota ***
        custoMateriais: custoProduto,
        detalhesMateriais: detalhesMateriaisProduto,
        custoMaoDeObraBase: custoMaoDeObraDetalhe,
        custoFerias13o: custoFerias13oDetalhe,
        totalMaoDeObra: totalMaoDeObra,
        custoIndiretoTotal: custoIndiretoTotal,
        detalhesCustosIndiretos: listaCustosIndiretosDetalhes,
        subtotal: subtotal,
        margemLucroValor: margemLucroValor,
        taxaCreditoValor: taxaCreditoValor
        // *** FIM - Salvando dados detalhados na nota ***
    };

    precificacoesGeradas.push(precificacao);
    atualizarTabelaPrecificacoesGeradas();
    salvarDados(); // Salva após gerar a nota
    backupAutomatico(); // Backup automático ao gerar nota

    // Limpa os campos após gerar a nota
    document.getElementById('nome-cliente').value = '';
    document.getElementById('produto-pesquisa').value = '';
    document.getElementById('horas-produto').value = '1';
    document.getElementById('margem-lucro-final').value = margemLucroPadrao; // Usa a variável global

    //Reseta os cálculos para os valores padrão.
    calcularCustos();
}

function atualizarTabelaPrecificacoesGeradas() {
    const tbody = document.querySelector('#tabela-precificacoes-geradas tbody');
    tbody.innerHTML = ''; // Limpa a tabela

    precificacoesGeradas.forEach((precificacao, index) => {
        const row = tbody.insertRow();

        row.insertCell().textContent = `${precificacao.numero}/${precificacao.ano}`;
        row.insertCell().textContent = precificacao.cliente;

        const actionsCell = row.insertCell();
        const viewButton = document.createElement('button');
        viewButton.textContent = 'Visualizar';
        // *** MODIFICAÇÃO: Chamar abrirPrecificacaoEmNovaJanela() ***
        viewButton.onclick = () => abrirPrecificacaoEmNovaJanela(index);
        actionsCell.appendChild(viewButton);
    });
}

function buscarPrecificacoesGeradas() {
    const termoBusca = document.getElementById('busca-precificacao').value.toLowerCase();
    const tbody = document.querySelector('#tabela-precificacoes-geradas tbody');
    tbody.innerHTML = '';

    precificacoesGeradas.filter(p =>
        `${p.numero}/${p.ano}`.toLowerCase().includes(termoBusca) ||
        p.cliente.toLowerCase().includes(termoBusca)
    ).forEach((precificacao, index) => {
        const row = tbody.insertRow();

        row.insertCell().textContent = `${precificacao.numero}/${precificacao.ano}`;
        row.insertCell().textContent = precificacao.cliente;

        const actionsCell = row.insertCell();
        const viewButton = document.createElement('button');
        viewButton.textContent = 'Visualizar';
        viewButton.onclick = () => abrirPrecificacaoEmNovaJanela(index);
        actionsCell.appendChild(viewButton);
    });
}

function visualizarPrecificacaoHTML(index) {
    const precificacao = precificacoesGeradas[index];

    if (!precificacao) {
        return "<p>Precificação não encontrada.</p>"; // Retorna mensagem de erro em HTML
    }

    let htmlTabela = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Nota de Precificação Nº ${precificacao.numero}/${precificacao.ano}</title>
            <style> /* CSS Inline para Teste */
                body { font-family: 'Roboto', Arial, sans-serif; }
                .tabela-precificacao-detalhada { width: 95%; border-collapse: collapse; margin: 20px auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); border-radius: 8px; overflow: hidden; border-spacing: 0; }
                .tabela-precificacao-detalhada th, .tabela-precificacao-detalhada td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 0.95em; }
                .tabela-precificacao-detalhada th { background-color: #7aa2a9; color: white; font-weight: bold; text-align: center; text-transform: uppercase; padding-top: 12px; padding-bottom: 12px; }
                .tabela-precificacao-detalhada td:first-child { font-weight: bold; color: #555; width: 40%; }
                .tabela-precificacao-detalhada td:nth-child(2) { width: 60%; }
                .tabela-precificacao-detalhada tbody tr:nth-child(even) { background-color: #f9f9f9; }
                .tabela-precificacao-detalhada tbody tr:hover { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h2>Nota de Precificação Nº ${precificacao.numero}/${precificacao.ano}</h2>
            <p><strong>Cliente:</strong> ${precificacao.cliente}</p>
            <table class="tabela-precificacao-detalhada">
                <thead>
                    <tr>
                        <th colspan="2">Detalhes da Precificação</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Produto:</strong></td>
                        <td>${precificacao.produto}</td>
                    </tr>
                    <tr>
                        <td><strong>Horas para Concluir:</strong></td>
                        <td>${precificacao.horas}</td>
                    </tr>
                    <tr>
                        <td><strong>Custo Total dos Materiais:</strong></td>
                        <td>${formatarMoeda(precificacao.custoMateriais)}</td>
                    </tr>
                     <tr>
                        <td><strong>Detalhes dos Materiais:</strong></td>
                        <td><ul>${precificacao.detalhesMateriais.map(detalhe => `<li>${detalhe}</li>`).join('')}</ul></td>
                    </tr>
                    <tr>
                        <td><strong>Custo Mão de Obra:</strong></td>
                        <td>${formatarMoeda(precificacao.totalMaoDeObra)}</td>
                    </tr>
                    <tr>
                        <td><strong>  • Custo Mão de Obra Base:</strong></td>
                        <td>${formatarMoeda(precificacao.custoMaoDeObraBase)}</td>
                    </tr>
                    <tr>
                        <td><strong>  • Custo 13º e Férias:</strong></td>
                        <td>${formatarMoeda(precificacao.custoFerias13o)}</td>
                    </tr>
                    <tr>
                        <td><strong>Custos Indiretos Totais:</strong></td>
                        <td>${formatarMoeda(precificacao.custoIndiretoTotal)}</td>
                    </tr>
                     <tr>
                        <td><strong>Detalhes Custos Indiretos:</strong></td>
                        <td><ul>${precificacao.detalhesCustosIndiretos.map(detalhe => `<li>${detalhe}</li>`).join('')}</ul></td>
                    </tr>
                    <tr>
                        <td><strong>Subtotal:</strong></td>
                        <td>${formatarMoeda(precificacao.subtotal)}</td>
                    </tr>
                    <tr>
                        <td><strong>Margem de Lucro (${precificacao.margem}%):</strong></td>
                        <td>${formatarMoeda(precificacao.margemLucroValor)}</td>
                    </tr>
                    <tr>
                        <td><strong>Total (com Margem de Lucro):</strong></td>
                        <td>${formatarMoeda(precificacao.total)}</td>
                    </tr>
                    <tr>
                        <td><strong>Taxa de Compra a Crédito:</strong></td>
                        <td>${formatarMoeda(precificacao.taxaCreditoValor)}</td>
                    </tr>
                    <tr>
                        <td><strong>Total Final (com Taxas):</strong></td>
                        <td><strong>${formatarMoeda(precificacao.totalComTaxas)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </body>
        </html>
    `;
    return htmlTabela; // Retorna a string HTML
}

function abrirPrecificacaoEmNovaJanela(index) {
    const htmlNota = visualizarPrecificacaoHTML(index); // Obtém o HTML da nota
    if (!htmlNota) {
        alert("Erro ao gerar nota de precificação."); // Mensagem de erro, caso `visualizarPrecificacaoHTML` retorne vazio
        return;
    }

    const novaJanela = window.open('', '_blank'); // Abre nova janela/aba em branco
    if (novaJanela) {
        novaJanela.document.open();
        novaJanela.document.write(htmlNota); // Escreve o HTML na nova janela
        novaJanela.document.close();
    } else {
        alert("Seu navegador pode ter bloqueado a abertura de uma nova janela. Permita pop-ups para este site.");
    }
}
/* ==== FIM SEÇÃO - PRECIFICAÇÕES GERADAS ==== */

/* ==== INÍCIO SEÇÃO - IMPORTAR/EXPORTAR/LIMPAR ==== */
function exportarDados() {
    const dadosParaExportar = JSON.stringify({
        materiais,
        maoDeObra,
        custosIndiretosPredefinidos,
        custosIndiretosAdicionais,
        produtos,
        taxaCredito,
        margemLucroPadrao,
        precificacoesGeradas,
        proximoNumeroPrecificacao
    });
    const blob = new Blob([dadosParaExportar], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = (agora.getMonth() + 1).toString().padStart(2, '0'); // Garante dois dígitos
    const dia = agora.getDate().toString().padStart(2, '0');
    const hora = agora.getHours().toString().padStart(2, '0');
    const minuto = agora.getMinutes().toString().padStart(2, '0');

    const nomeArquivo = `${ano}${mes}${dia}_${hora}${minuto}_Backup_Precificacao_Pérola_Rara.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo; // Nome do arquivo formatado
    a.style.display = 'none'; // Oculta o link
    document.body.appendChild(a); // Adiciona ao corpo do documento
    a.click(); // Simula o clique
    document.body.removeChild(a); // Remove o link
    URL.revokeObjectURL(url); // Libera a URL

    // Atualiza o painel de último backup *após* a exportação
    atualizarPainelUltimoBackup();
    backupAutomatico(); // Backup manual via exportar
}

function importarDados() {
  const input = document.getElementById('inputImportar');
  const file = input.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const dados = JSON.parse(e.target.result);

        // Validação básica para evitar erros
        if (typeof dados !== 'object' || dados === null) {
           throw new Error('Dados inválidos no arquivo.');
        }

        // Importa os dados (com tratamento para arrays)
        materiais = Array.isArray(dados.materiais) ? dados.materiais : [];
        maoDeObra = typeof dados.maoDeObra === 'object' && dados.maoDeObra !== null ? dados.maoDeObra : maoDeObra;
        custosIndiretosPredefinidos = Array.isArray(dados.custosIndiretosPredefinidos) ? dados.custosIndiretosPredefinidos : custosIndiretosPredefinidosBase; //Usa o base, caso esteja vazio.
        custosIndiretosAdicionais = Array.isArray(dados.custosIndiretosAdicionais) ? dados.custosIndiretosAdicionais : [];
        produtos = Array.isArray(dados.produtos) ? dados.produtos : [];
        taxaCredito = typeof dados.taxaCredito === 'object' && dados.taxaCredito !== null ? dados.taxaCredito : { percentual: 5, incluir: false };
        margemLucroPadrao = typeof dados.margemLucroPadrao === 'number' ? dados.margemLucroPadrao : 50;
        precificacoesGeradas = Array.isArray(dados.precificacoesGeradas) ? dados.precificacoesGeradas : [];
        proximoNumeroPrecificacao = typeof dados.proximoNumeroPrecificacao === 'number' ? dados.proximoNumeroPrecificacao : 1;

        // Atualiza as tabelas e campos
        atualizarTabelaMateriaisInsumos();
        atualizarTabelaCustosIndiretos();
        carregarCustosIndiretosPredefinidos();
        atualizarTabelaProdutosCadastrados();
        atualizarTabelaPrecificacoesGeradas();

        // Atualiza os campos de mão de obra
        document.getElementById('salario-receber').value = maoDeObra.salario;
        document.getElementById('horas-trabalhadas').value = maoDeObra.horas;
        document.getElementById('incluir-ferias-13o-sim').checked = maoDeObra.incluirFerias13o;
        document.getElementById('incluir-ferias-13o-nao').checked = !maoDeObra.incluirFerias13o;
        calcularValorHora(); // Para exibir os valores
        calcularCustoFerias13o();

        //Atualiza os campos de taxa de crédito e margem.
        document.getElementById('margem-lucro-final').value = margemLucroPadrao;
        document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;
         if (taxaCredito.incluir) {
            document.getElementById('incluir-taxa-credito-sim').checked = true;
        } else {
            document.getElementById('incluir-taxa-credito-nao').checked = true;
        }

        calcularCustos(); // Recalcula tudo

        alert('Dados importados com sucesso!');

      } catch (error) {
        console.error('Erro ao importar dados:', error);
        alert('Erro ao importar dados. Verifique o arquivo e tente novamente.');
      }
    };
    reader.readAsText(file);
  } else {
    alert('Nenhum arquivo selecionado.');
  }
}

function salvarDados() {
    const dados = {
        materiais,
        maoDeObra,
        custosIndiretosPredefinidos,
        custosIndiretosAdicionais,
        produtos,
        taxaCredito,
        margemLucroPadrao,
        precificacoesGeradas,
        proximoNumeroPrecificacao
    };
    localStorage.setItem('dadosPrecificacao', JSON.stringify(dados));

    // Backup automático foi removido daqui, agora é chamado explicitamente nos botões de ação.
}

function carregarDados() {
    try {
        const dadosSalvos = localStorage.getItem('dadosPrecificacao');
        if (dadosSalvos) {
            const dados = JSON.parse(dadosSalvos);
            console.log("Dados Carregados:", dados); // ADICIONADO CONSOLE.LOG

            // Carrega os dados (com tratamento para arrays, para evitar erros)
            materiais = Array.isArray(dados.materiais) ? dados.materiais : [];
            maoDeObra = typeof dados.maoDeObra === 'object' && dados.maoDeObra !== null ? dados.maoDeObra : maoDeObra;
            custosIndiretosPredefinidos = Array.isArray(dados.custosIndiretosPredefinidos) ? dados.custosIndiretosPredefinidos : custosIndiretosPredefinidosBase; //Usa o base se vier vazio
            custosIndiretosAdicionais = Array.isArray(dados.custosIndiretosAdicionais) ? dados.custosIndiretosAdicionais : [];
            produtos = Array.isArray(dados.produtos) ? dados.produtos : [];
            taxaCredito = typeof dados.taxaCredito === 'object' && dados.taxaCredito !== null ? dados.taxaCredito : { percentual: 5, incluir: false };
            margemLucroPadrao = typeof dados.margemLucroPadrao === 'number' ? dados.margemLucroPadrao : 50; //Valor padrão.
            precificacoesGeradas = Array.isArray(dados.precificacoesGeradas) ? dados.precificacoesGeradas : [];
            proximoNumeroPrecificacao = typeof dados.proximoNumeroPrecificacao === 'number' ? dados.proximoNumeroPrecificacao : 1;


            // Atualiza as tabelas
            atualizarTabelaMateriaisInsumos();
            atualizarTabelaCustosIndiretos();
            carregarCustosIndiretosPredefinidos(); // Recarrega a lista
            atualizarTabelaProdutosCadastrados();
            atualizarTabelaPrecificacoesGeradas();

             // Atualiza os campos de mão de obra
            document.getElementById('salario-receber').value = maoDeObra.salario;
            document.getElementById('horas-trabalhadas').value = maoDeObra.horas;
            document.getElementById('incluir-ferias-13o-sim').checked = maoDeObra.incluirFerias13o;
            document.getElementById('incluir-ferias-13o-nao').checked = !maoDeObra.incluirFerias13o;
            calcularValorHora();  //Para exibir os valores
            calcularCustoFerias13o();

            //Atualiza visualmente os campos de taxa e margem
            document.getElementById('margem-lucro-final').value = margemLucroPadrao;
            document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;

            if(taxaCredito.incluir){
              document.getElementById('incluir-taxa-credito-sim').checked = true;
            } else{
              document.getElementById('incluir-taxa-credito-nao').checked = true;
            }

            calcularCustos(); // Recalcula tudo.

        } else {
            console.log("Nenhum dado encontrado no localStorage."); // Mensagem no console
        }
    } catch (error) {
        console.error("Erro ao carregar dados do localStorage:", error);
        alert("Erro ao carregar dados salvos. Os valores padrão serão usados."); // Aviso para o usuário
    }
}

function atualizarPainelUltimoBackup() {
    const ultimoBackup = localStorage.getItem('ultimoBackup');
    const painel = document.getElementById('ultimoBackup');

    if (ultimoBackup) {
        const { nomeArquivo, data } = JSON.parse(ultimoBackup);
        const dataObj = new Date(data);

        // Formata a data/hora
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        painel.textContent = `Último backup: ${nomeArquivo} (${dataFormatada} às ${horaFormatada})`;
    } else {
        painel.textContent = 'Nenhum backup encontrado.';
    }
}

function limparPagina() {
    if (confirm('Tem certeza que deseja limpar todos os dados? Essa ação não pode ser desfeita.')) {
        localStorage.removeItem('dadosPrecificacao');
        localStorage.removeItem('ultimoBackup');

        // Zera todas as variáveis
        materiais = [];
        maoDeObra = { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
        custosIndiretosPredefinidos = JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase)); //Restaura o array base.
        custosIndiretosAdicionais = [];
        produtos = [];
        taxaCredito = { percentual: 5, incluir: false };
        margemLucroPadrao = 50;
        precificacoesGeradas = [];
        proximoNumeroPrecificacao = 1;


        // Limpa as tabelas
        atualizarTabelaMateriaisInsumos();
        atualizarTabelaCustosIndiretos();
        atualizarTabelaProdutosCadastrados();
        atualizarTabelaPrecificacoesGeradas();
        carregarCustosIndiretosPredefinidos(); // Recarrega a lista limpa.

        // Limpa os formulários
        limparFormulario('form-materiais-insumos');
        limparFormulario('form-mao-de-obra');
        limparFormulario('form-produtos-cadastrados');
        document.querySelector('#tabela-materiais-produto tbody').innerHTML = ''; //E a tabela de materiais do produto

        // Reseta os campos de mão de obra
        document.getElementById('salario-receber').value = '';
        document.getElementById('horas-trabalhadas').value = 220;
        document.getElementById('incluir-ferias-13o-nao').checked = true;
        calcularValorHora(); // Recalcula para exibir 0
        calcularCustoFerias13o();

        //Reseta visualmente os campos de taxa e margem
        document.getElementById('margem-lucro-final').value = margemLucroPadrao;
        document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;
        document.getElementById('incluir-taxa-credito-nao').checked = true;

        // Limpa o painel de último backup
        atualizarPainelUltimoBackup();

        calcularCustos(); //Recalcula tudo (para zerar os valores)
    }
}
/* ==== FIM SEÇÃO - IMPORTAR/EXPORTAR/LIMPAR ==== */



