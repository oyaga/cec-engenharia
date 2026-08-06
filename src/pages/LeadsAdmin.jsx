import React, { useState, useEffect } from 'react';
import { leadsApi } from '../services/site';
import {
  Users, MessageSquare, Phone, Calendar,
  CheckCircle, Clock, Trash2, Search, ExternalLink, Download, BookOpen
} from 'lucide-react';

const LeadsAdmin = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterCourse, setFilterCourse] = useState('todos');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { leads } = await leadsApi.list({ status: filterStatus, course_interest: filterCourse });
      setLeads(leads || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filterStatus, filterCourse]);

  const updateStatus = async (id, newStatus) => {
    try {
      await leadsApi.update(id, { status: newStatus });
      fetchLeads();
    } catch (err) {
      alert('Erro ao atualizar status: ' + (err.message || JSON.stringify(err)));
    }
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Excluir este contato permanentemente?')) return;
    try {
      await leadsApi.remove(id);
      fetchLeads();
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || JSON.stringify(err)));
    }
  };

  const exportToCSV = () => {
    if (leads.length === 0) return;
    
    // Cabeçalhos
    const headers = ["Nome", "Telefone", "E-mail", "Curso de Interesse", "Mensagem", "Status", "Data"];
    
    // Dados formatados
    const csvRows = leads.map(lead => [
      lead.name || "Sem Nome",
      lead.phone || "Sem Telefone",
      lead.email || "Não informado",
      lead.course_interest || "Não informado",
      `"${(lead.message || '').replace(/"/g, '""')}"`, // Escapar aspas na mensagem
      lead.status || "novo",
      lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '-'
    ]);

    // Criar o conteúdo do CSV
    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => row.join(","))
    ].join("\n");

    // Criar e baixar o arquivo (com BOM para acentos funcionarem no Excel)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_cec_engenharia_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter(lead => {
    const name = lead.name || '';
    const phone = lead.phone || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'novo': return 'bg-blue-100 text-blue-700';
      case 'em_atendimento': return 'bg-yellow-100 text-yellow-700';
      case 'concluido': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="text-primary" /> Gestão de Leads e Contatos
          </h1>
          <p className="text-secondary">Interessados que entraram em contato pelo site.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button 
            onClick={exportToCSV}
            className="btn btn-secondary flex items-center gap-2"
            disabled={leads.length === 0}
          >
            <Download size={18} /> Baixar Planilha
          </button>

          <select 
            className="border rounded-lg px-4 py-2"
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
          >
            <option value="todos">Todos os Cursos</option>
            <option value="Inspetor Dimensional Caldeiraria e Tubulação (CD-CL)">Caldeiraria (CD-CL)</option>
            <option value="Estação Total Aplicado a Caldeiraria">Estação Total</option>
            <option value="Inspetor Dimensional de Mecânica (CD-MC)">Mecânica (CD-MC)</option>
            <option value="Inspetor Dimensional de Topografia (CD-TO)">Topografia (CD-TO)</option>
            <option value="Newsletter">Newsletter</option>
          </select>

          <select 
            className="border rounded-lg px-4 py-2"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="todos">Todos os Status</option>
            <option value="novo">Novos</option>
            <option value="em_atendimento">Em Atendimento</option>
            <option value="concluido">Concluídos</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou fone..."
              className="pl-10 pr-4 py-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">Carregando contatos...</div>
      ) : (
        <div className="grid gap-4">
          {filteredLeads.map(lead => (
            <div key={lead.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex gap-4 min-w-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-primary font-bold shrink-0">
                    {(lead.name || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <h3 className="font-bold text-lg">{lead.name || 'Sem Nome'}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getStatusColor(lead.status || 'novo')}`}>
                        {(lead.status || 'novo').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-secondary mb-2">
                      <span className="flex items-center gap-1"><Phone size={14} /> {lead.phone || 'Sem Telefone'}</span>
                      {lead.email && <span className="flex items-center gap-1">✉️ {lead.email}</span>}
                      <span className="flex items-center gap-1"><Calendar size={14} /> {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      {lead.course_interest && (
                        <span className="flex items-center gap-1 text-primary font-bold">
                          <BookOpen size={14} /> {lead.course_interest}
                        </span>
                      )}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border italic text-secondary max-w-2xl">
                      "{lead.message || 'Sem mensagem.'}"
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a 
                    href={`https://wa.me/${(lead.phone || '').replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-success flex items-center gap-2 justify-center"
                  >
                    <ExternalLink size={16} /> Chamar no WhatsApp
                  </a>
                  
                  <div className="flex gap-2">
                    {lead.status === 'novo' && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateStatus(lead.id, 'em_atendimento');
                        }} 
                        className="btn btn-secondary flex-1"
                      >
                        Iniciado
                      </button>
                    )}
                    {lead.status !== 'concluido' && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateStatus(lead.id, 'concluido');
                        }} 
                        className="btn btn-primary flex-1"
                      >
                        Concluir
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteLead(lead.id);
                      }} 
                      className="btn bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredLeads.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed">
              <Users size={48} className="mx-auto text-muted mb-4 opacity-20" />
              <p className="text-muted">Nenhum contato encontrado com esses filtros.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadsAdmin;
