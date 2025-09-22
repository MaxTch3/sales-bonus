/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const { discount, sale_price, quantity } = purchase;
  const discountRate = discount / 100;
  const fullAmount = sale_price * quantity;
  const revenue = fullAmount * (1 - discountRate);
  return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;
  if (index === 0) {
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    return profit * 0.1;
  } else if (index >= total - 1) {
    return profit * 0.05;
  }
  return 0;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.purchase_records)
  ) {
    throw new Error("Неверный формат входных данных");
  }
  // @TODO: Проверка наличия опций
  if (!options || typeof options !== "object") {
    throw new Error("Неверныe или отсутствующие опции");
  }
  // @TODO: Подготовка промежуточных данных для сбора статистики
  const allPurchases = [];
  for (const record of data.purchase_records) {
    const { seller_id, items } = record;
    for (const item of items) {
      allPurchases.push({ seller_id, ...item });
    }
  }
  // @TODO: Индексация продавцов и товаров для быстрого доступа

  const sellersById = new Map();
  for (const seller of data.sellers) {
    sellersById.set(seller.id, seller);
  }

  const productsBySku = new Map();
  for (const product of data.products) {
    productsBySku.set(product.sku, product);
  }
  // @TODO: Расчет выручки и прибыли для каждого продавца
  const sellersStats = new Map();
  for (const purchase of allPurchases) {
    const { seller_id, sku, quantity } = purchase;
    const product = productsBySku.get(sku);
    if (!product) continue;
    const revenue = calculateSimpleRevenue(purchase, product);
    const cost = product.purchase_price * quantity;
    const profit = revenue - cost;
    if (!sellersStats.has(seller_id)) {
      const sellerInfo = sellersById.get(seller_id) || {};
      sellersStats.set(seller_id, {
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        name: `${sellerInfo.first_name || ''} ${sellerInfo.last_name || ''}`.trim(),
      });
    }
    const stats = sellersStats.get(seller_id);
    stats.revenue += revenue;
    stats.profit += profit;
    stats.sales_count += quantity;
    stats.products_sold[sku] = (stats.products_sold[sku] || 0) + quantity;
  }
  // @TODO: Сортировка продавцов по прибыли

  const sortedSellers = Array.from(sellersStats.entries())
    .map(([seller_id, stats]) => ({ seller_id, ...stats }))
    .sort((a, b) => b.profit - a.profit);
  // @TODO: Назначение премий на основе ранжирования
  const totalSellers = sortedSellers.length;
  sortedSellers.forEach((seller, index) => {
    seller.bonus = calculateBonusByProfit(index, totalSellers, seller);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями

  const result = sortedSellers.map((seller) => {
    return {
      seller_id: seller.seller_id,
      name: seller.name,
      revenue: Number(seller.revenue.toFixed(2)),
      profit: Number(seller.profit.toFixed(2)),
      bonus: Number((seller.bonus || 0).toFixed(2)),
      sales_count: seller.sales_count,
      top_products: Object.entries(seller.products_sold)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([sku, quantity]) => ({ sku, quantity })),
    };
  });
  return result;
}
