'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Newspaper, Clock, ExternalLink, TrendingUp, Loader2, Tag } from 'lucide-react';

// Função para formatar o tempo (Há 10 min, Há 2 horas...)
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  
  if (diffInMinutes < 60) return `Há ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Há ${diffInHours}h`;
  return `Há ${Math.floor(diffInHours / 24)} dias`;
};

export default function NewsPage() {
  const [news, setNews] = useState<any[]>([]);
  const [filteredNews, setFilteredNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para os filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [availableCategories, setAvailableCategories] = useState<string[]>(['Todas']);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Busca o Feed Oficial do InfoMoney
        const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.infomoney.com.br/mercados/feed/');
        const data = await res.json();
        
        if (data.status === 'ok') {
          const fetchedNews = data.items;
          setNews(fetchedNews);
          setFilteredNews(fetchedNews);

          // Extrai as categorias únicas, mas com FILTRO DE QUALIDADE
          const categoriesSet = new Set<string>();
          fetchedNews.forEach((item: any) => {
            if (item.categories && item.categories.length > 0) {
              item.categories.forEach((cat: string) => {
                // REGRA: Só aceita categorias com no máximo 15 letras e que não tenham vírgulas ou traços
                if (cat.length <= 15 && !cat.includes(',') && !cat.includes('-')) {
                  // Coloca a primeira letra em maiúscula para ficar bonito
                  const cleanCat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
                  categoriesSet.add(cleanCat);
                }
              });
            }
          });
          
          // Pega apenas as 5 primeiras categorias que passaram no teste
          setAvailableCategories(['Todas', ...Array.from(categoriesSet).slice(0, 5)]);
        }
      } catch (error) {
        console.error("Erro ao buscar notícias:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Efeito que roda toda vez que o usuário digita na busca ou clica numa categoria
  useEffect(() => {
    let result = news;

    if (activeCategory !== 'Todas') {
      result = result.filter(item => {
        // Como limpamos a categoria nos botões, precisamos verificar de forma flexível no filtro
        return item.categories?.some((c: string) => c.toLowerCase() === activeCategory.toLowerCase());
      });
    }

    if (searchTerm.trim() !== '') {
      result = result.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNews(result);
  }, [searchTerm, activeCategory, news]);

  return (
    <div className="flex h-screen w-full bg-background-dark overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden relative">
        <Header />
        
        <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto w-full pb-20">
          
          {/* Cabeçalho da Página */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Newspaper className="w-6 h-6" />
                </div>
                News <span className="text-primary">Terminal</span>
              </h2>
              <p className="text-sm font-medium text-slate-500">
                Acompanhe o fluxo de notícias do mercado financeiro em tempo real.
              </p>
            </div>

            {/* Barra de Busca Dinâmica */}
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar notícias..."
                className="w-full bg-surface-dark border border-border-dark rounded-2xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-primary/50 focus:border-primary/30 text-sm text-white placeholder:text-slate-600 transition-all"
              />
            </div>
          </motion.div>

          {/* Botões de Categoria (Gerados Automáticamente) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center gap-2"
          >
            <Tag className="w-4 h-4 text-slate-500 mr-2" />
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                  activeCategory === cat 
                    ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' 
                    : 'bg-surface-dark text-slate-400 border border-border-dark hover:border-primary/50 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* Grid de Notícias */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <span className="text-sm font-bold uppercase tracking-widest">Sincronizando Terminal de Notícias...</span>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence>
                {filteredNews.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full py-20 text-center bg-surface-dark/50 border border-dashed border-border-dark rounded-3xl"
                  >
                    <Newspaper className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                    <p className="text-slate-400 font-medium">Nenhuma notícia encontrada para "{searchTerm}".</p>
                  </motion.div>
                ) : (
                  filteredNews.map((item, index) => (
                    <motion.a 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      key={item.link}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col bg-surface-dark rounded-3xl border border-border-dark shadow-sm hover:border-primary/30 hover:shadow-primary/5 transition-all overflow-hidden h-full"
                    >
                      {/* Imagem da Notícia (Se houver na API) */}
                      {item.thumbnail && (
                        <div className="w-full h-48 overflow-hidden bg-background-dark relative">
                          <img 
                            src={item.thumbnail} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark to-transparent" />
                        </div>
                      )}

                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(item.pubDate)}
                          </span>
                          {item.categories && item.categories.length > 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              {item.categories[0]}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors leading-snug mb-4 line-clamp-3">
                          {item.title}
                        </h3>
                        
                        <div className="mt-auto pt-4 border-t border-border-dark flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 group-hover:text-white transition-colors">
                            Ler matéria completa
                          </span>
                          <div className="w-8 h-8 rounded-full bg-background-dark flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-background-dark transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </motion.a>
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}