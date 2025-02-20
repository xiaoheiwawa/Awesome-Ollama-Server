'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ArrowPathIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface OllamaService {
  server: string;
  models: string[];
  tps: number;
  lastUpdate: string;
}

type SortField = 'tps' | 'lastUpdate';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Home() {
  const [services, setServices] = useState<OllamaService[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  // 排序状态
  const [sortField, setSortField] = useState<SortField>('tps');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // 过滤状态
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 弹窗状态
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchData = async () => {
    try {
      const response = await fetch('/data.json');
      const data = await response.json();
      setServices(data);
      
      // 更新可用模型列表
      const models = new Set<string>();
      data.forEach((service: OllamaService) => {
        service.models.forEach(model => models.add(model));
      });
      setAvailableModels(Array.from(models).sort());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const refreshData = async () => {
    if (loading || countdown > 0) return;

    setLoading(true);
    try {
      await fetch('/api/monitor');
      await fetchData();
      setLastRefresh(new Date());
      setCountdown(60);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

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
      selectedModels.length === 0 || 
      service.models.some(model => selectedModels.includes(model))
    )
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
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

  // 生成页码数组
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

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

  // 排序图标组件
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <ArrowUpIcon className="h-4 w-4 inline-block ml-1" /> :
      <ArrowDownIcon className="h-4 w-4 inline-block ml-1" />;
  };

  // 获取过滤后的模型列表
  const filteredModels = availableModels.filter(model => 
    model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            Ollama Available Service
          </h1>
          <button
            onClick={refreshData}
            disabled={loading || countdown > 0}
            className={`inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium
              transition-all duration-200 ease-in-out
              ${loading || countdown > 0 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white'
              }`}
          >
            <ArrowPathIcon className={`-ml-1 mr-2 h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '刷新中...' :
             countdown > 0 ? `${countdown}秒后可刷新` : '刷新数据'}
          </button>
        </div>

        <div className="bg-gray-800 shadow-xl rounded-xl overflow-hidden border border-gray-700 mb-6">
          <div className="p-6 border-b border-gray-700 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-200">模型过滤</h2>
                <div className="flex space-x-4">
                  <button
                    onClick={() => toggleSort('tps')}
                    className={`px-4 py-2 text-sm font-medium rounded-md border border-gray-600
                      transition-all duration-200 hover:bg-gray-700
                      ${sortField === 'tps' ? 'bg-gray-700 text-blue-400' : 'text-gray-300'}`}
                  >
                    TPS 排序
                    <SortIcon field="tps" />
                  </button>
                  <button
                    onClick={() => toggleSort('lastUpdate')}
                    className={`px-4 py-2 text-sm font-medium rounded-md border border-gray-600
                      transition-all duration-200 hover:bg-gray-700
                      ${sortField === 'lastUpdate' ? 'bg-gray-700 text-blue-400' : 'text-gray-300'}`}
                  >
                    更新时间排序
                    <SortIcon field="lastUpdate" />
                  </button>
                </div>
              </div>
              
              {/* 搜索输入框 */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索模型..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 
                    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 已选模型 */}
              {selectedModels.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">已选模型：</span>
                    <button
                      onClick={clearSelectedModels}
                      className="text-sm text-gray-400 hover:text-gray-300"
                    >
                      清空选择
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedModels.map(model => (
                      <span
                        key={model}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm
                          bg-gradient-to-r from-blue-500/20 to-teal-500/20 text-blue-400 border border-blue-500/30"
                      >
                        {model}
                        <button
                          onClick={() => removeSelectedModel(model)}
                          className="ml-2 text-blue-400 hover:text-blue-300 focus:outline-none"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 模型列表 */}
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                {filteredModels.map(model => (
                  <button
                    key={model}
                    onClick={() => toggleModelSelection(model)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200
                      ${selectedModels.includes(model)
                        ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 分页控制 */}
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">每页显示：</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded-md text-gray-200 px-2 py-1
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div className="text-gray-400">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAndSortedServices.length)} 条，
              共 {filteredAndSortedServices.length} 条
            </div>
          </div>

          {/* 服务列表 */}
          <ul className="divide-y divide-gray-700">
            {paginatedServices.map((service, index) => (
              <li key={index} className="p-6 hover:bg-gray-750 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <a
                      href={service.server}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-blue-400 hover:text-blue-300 transition-colors duration-200"
                    >
                      {service.server}
                    </a>
                    <div className="mt-2">
                      <span className="text-sm text-gray-400">可用模型：</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {service.models.map((model, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              bg-gradient-to-r from-teal-500/20 to-blue-500/20 text-teal-400 border border-teal-500/30"
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="ml-6 flex flex-col items-end">
                    <div className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
                      {service.tps.toFixed(2)} TPS
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      最后更新：
                      {formatDistanceToNow(new Date(service.lastUpdate), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {paginatedServices.length === 0 && (
              <li className="p-6 text-center text-gray-400">
                暂无可用服务
              </li>
            )}
          </ul>

          {/* 分页导航 */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-700 flex justify-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md text-sm font-medium
                    ${currentPage === 1
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  首页
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md text-sm font-medium
                    ${currentPage === 1
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  上一页
                </button>
                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' && handlePageChange(page)}
                    disabled={page === '...'}
                    className={`px-3 py-1 rounded-md text-sm font-medium
                      ${page === currentPage
                        ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                        : page === '...'
                          ? 'bg-gray-700 text-gray-500 cursor-default'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md text-sm font-medium
                    ${currentPage === totalPages
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  下一页
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md text-sm font-medium
                    ${currentPage === totalPages
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  末页
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-400 text-right">
          共 {filteredAndSortedServices.length} 个服务
          {selectedModels.length > 0 && ` (已过滤模型: ${selectedModels.join(', ')})`}
        </div>

        {/* 页脚信息 */}
        <footer className="mt-12 border-t border-gray-700 pt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 作者信息 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-4">关于作者</h3>
                <div className="space-y-2">
                  <p className="text-gray-400">
                    作者：
                    <a 
                      href="https://github.com/forrany"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                    >
                      VincentKo (@forrany)
                    </a>
                  </p>
                  <p className="text-gray-400">
                    本项目基于 MIT 协议开源，欢迎贡献和使用。
                  </p>
                </div>
              </div>

              {/* 免责声明 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-4">免责声明</h3>
                <div className="space-y-2 text-gray-400 text-sm">
                  <p>
                    1. 本网站仅用于安全研究和教育目的，展示的所有服务信息均来自互联网公开数据。
                  </p>
                  <p>
                    2. 如果您发现自己的服务出现在列表中，建议及时加强网络安全防护措施。
                  </p>
                  <p>
                    3. 本站不对任何因使用本站信息而导致的直接或间接损失负责。
                  </p>
                  <p>
                    4. 请遵守当地法律法规，不得利用本站信息从事任何违法活动。
                  </p>
                </div>
              </div>
            </div>

            {/* 版权信息 */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <p className="text-gray-400 text-sm">
                  © {new Date().getFullYear()} Ollama Monitor Service. All rights reserved.
                </p>
                <div className="flex items-center space-x-4">
                  <a
                    href="https://github.com/forrany"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-300 transition-colors duration-200"
                  >
                    GitHub
                  </a>
                  <span className="text-gray-600">|</span>
                  <a
                    href="https://github.com/forrany"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-300 transition-colors duration-200"
                  >
                    MIT License
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
