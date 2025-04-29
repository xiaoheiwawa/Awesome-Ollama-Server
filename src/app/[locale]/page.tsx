'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Header } from '@/components/Header';
import { ModelFilter } from '@/components/ModelFilter';
import { ServiceList } from '@/components/ServiceList';
import { Footer } from '@/components/Footer';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { OllamaService, SortField, SortOrder } from '@/types';
import { useParams } from 'next/navigation';


export default function Home() {
  const t = useTranslations();
  const [services, setServices] = useState<OllamaService[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [detectingServices, setDetectingServices] = useState<Set<string>>(new Set());
  const [detectedResults, setDetectedResults] = useState<OllamaService[]>([]);

  const { locale } = useParams();
  
  // 排序状态
  const [sortField, setSortField] = useState<SortField>('tps');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // 过滤状态
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 客户端渲染标记
  const [isClient, setIsClient] = useState(false);

  const fetchData = async () => {
    try {
      // 使用绝对路径
      const response = await fetch('/data.json', {
        // 添加 cache 控制
        cache: 'no-store', // 或者使用 'force-cache' 如果你想要缓存
      });
      const data = await response.json();
      // 确保所有服务都有 loading 属性
      const servicesWithLoading = data.map((service: OllamaService) => ({
        ...service,
        loading: false,
        status: service.models.length > 0 ? 'success' : 'error'
      }));
      setServices(servicesWithLoading);
      
      // 更新可用模型列表
      const models = new Set<string>();
      servicesWithLoading.forEach((service: OllamaService) => {
        service.models.forEach(model => models.add(model));
      });
      setAvailableModels(Array.from(models).sort());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleDetect = async (urls: string[]): Promise<void> => {
    try {
      setDetectingServices(new Set(urls));
      
      for (const url of urls) {
        try {
          const response = await fetch('/api/detect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
          });

          if (!response.ok) {
            console.error(`检测失败: ${url}, 状态码: ${response.status}`);
            setDetectedResults(prev => [...prev, {
              server: url,
              models: [],
              tps: 0,
              lastUpdate: new Date().toISOString(),
              status: 'error'
            }]);
            continue;
          }

          const result = await response.json();
          setDetectedResults(prev => [...prev, result]);

        } catch (error) {
          console.error(`检测出错: ${url}`, error);
          setDetectedResults(prev => [...prev, {
            server: url,
            models: [],
            tps: 0,
            lastUpdate: new Date().toISOString(),
            status: 'error'
          }]);
        } finally {
          setDetectingServices(prev => {
            const next = new Set(prev);
            next.delete(url);
            return next;
          });
        }
      }
      
      setCountdown(5);
    } catch (error) {
      console.error('检测过程出错:', error);
      setDetectingServices(new Set());
    }
  };

  useEffect(() => {
    // 只在客户端执行
    if (typeof window !== 'undefined') {
      fetchData();
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 排序函数
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 切换模型选择
  const toggleModelSelection = (model: string) => {
    setSelectedModels(prev => 
      prev.includes(model)
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };

  // 移除单个选中的模型
  const removeSelectedModel = (model: string) => {
    setSelectedModels(prev => prev.filter(m => m !== model));
  };

  // 清空所有选中的模型
  const clearSelectedModels = () => {
    setSelectedModels([]);
  };

  // 过滤和排序服务列表
  const filteredAndSortedServices = services
    .filter(service => 
      // 过滤掉伪装服务
      (!service.isFake) && 
      (selectedModels.length === 0 || 
      service.models.some(model => selectedModels.includes(model)))
    )
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      
      // 只有在有选中的模型时，才特殊处理排序
      if (selectedModels.length > 0) {
        // 检查服务是否包含选中的模型
        const aHasSelectedModel = a.models.some(model => selectedModels.includes(model));
        const bHasSelectedModel = b.models.some(model => selectedModels.includes(model));
        
        // 如果 a 包含选中的模型但 b 不包含，则 a 排在前面
        if (aHasSelectedModel && !bHasSelectedModel) return -1;
        // 如果 b 包含选中的模型但 a 不包含，则 b 排在前面
        if (!aHasSelectedModel && bHasSelectedModel) return 1;
      }
      
      // 将 loading 状态的服务排在最前面
      if (a.loading && !b.loading) return -1;
      if (!a.loading && b.loading) return 1;
      
      if (sortField === 'tps') {
        return (a.tps - b.tps) * multiplier;
      } else {
        return (new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime()) * multiplier;
      }
    });

  // 计算分页数据
  const paginatedServices = filteredAndSortedServices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 计算总页数
  const totalPages = Math.ceil(filteredAndSortedServices.length / pageSize);

  // 页面改变处理
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 每页显示数量改变处理
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // 当过滤条件改变时，重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedModels, sortField, sortOrder]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <Header
            countdown={countdown}
            detectingServices={detectingServices}
            detectedResults={detectedResults}
            onDetect={handleDetect}
          />
          <div className="flex items-center space-x-3">
            <a 
              href="https://github.com/forrany/Awesome-Ollama-Server" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors duration-200"
              title="GitHub"
            >
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
            <LanguageSwitch currentLocale={locale as "en" | "zh"} />
          </div>
        </div>

        <div className="bg-gray-800 shadow-xl rounded-xl overflow-hidden border border-gray-700 mb-6">
          <ModelFilter
            selectedModels={selectedModels}
            availableModels={availableModels}
            searchTerm={searchTerm}
            sortField={sortField}
            sortOrder={sortOrder}
            onSearchChange={setSearchTerm}
            onToggleModel={toggleModelSelection}
            onRemoveModel={removeSelectedModel}
            onClearModels={clearSelectedModels}
            onToggleSort={toggleSort}
          />

          <ServiceList
            services={paginatedServices}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            isClient={isClient}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
        
        <div className="text-sm text-gray-400 text-right">
          {t('service.total', { count: filteredAndSortedServices.length })}
          {selectedModels.length > 0 && t('service.filtered', { models: selectedModels.join(', ') })}
        </div>

        <Footer />
      </div>
    </main>
  );
} 