async function FormatarData(data){

    const dataUTC = new Date(data);
    console.log("Chegando aqui")

    // Formatando a data para o padrão brasileiro
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        timeZone: 'America/Sao_Paulo' 
    };

    const dataFormatada = dataUTC.toLocaleString('pt-BR', options);

    return dataFormatada;
}

// Exemplo de uso
module.exports = { 
    FormatarData,
};