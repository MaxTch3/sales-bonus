/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
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
  const { profit } = seller;
  if (index === 0) {
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    return profit * 0.1;
  } else if (index < total - 1) {
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
  if (
    !data ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.purchase_records)
  ) {
    throw new Error("Неверный формат входных данных");
  }

  if (data.sellers.length === 0) {
    throw new Error("Нет данных о продавцах");
  }

  if (data.products.length === 0) {
    throw new Error("Нет данных о товарах");
  }

  if (data.purchase_records.length === 0) {
    throw new Error("Нет данных о продажах");
  }

  if (arguments.length < 2) {
    throw new Error("Отсутствуют опции");
  }

  if (!options || typeof options !== "object") {
    throw new Error("Неверныe или отсутствующие опции");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (typeof calculateRevenue !== "function") {
    throw new Error("Опция должна быть функцией");
  }

  if (typeof calculateBonus !== "function") {
    throw new Error("Опция должна быть функцией");
  }

  const sellersById = new Map();
  for (const seller of data.sellers) {
    sellersById.set(seller.id, seller);
  }

  const productsBySku = new Map();
  for (const product of data.products) {
    productsBySku.set(product.sku, product);
  }

  const sellersStats = new Map();

  for (const record of data.purchase_records) {
    const { seller_id, receipt_id, items } = record;
    const sellerInfo = sellersById.get(seller_id) || {};

    if (!sellersStats.has(seller_id)) {
      sellersStats.set(seller_id, {
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        name: `${sellerInfo.first_name || ""} ${
          sellerInfo.last_name || ""
        }`.trim(),
      });
    }

    const stats = sellersStats.get(seller_id);
    stats.sales_count += 1;
    stats.revenue += record.total_amount;

    for (const item of items) {
      const { sku, quantity } = item;
      const product = productsBySku.get(sku);
      if (!product) continue;
      const revenue = calculateRevenue(item, product);
      const cost = product.purchase_price * quantity;
      const profit = revenue - cost;
      stats.profit += profit;
      stats.products_sold[sku] = (stats.products_sold[sku] || 0) + quantity;
    }
  }

  const sortedSellers = Array.from(sellersStats.entries())
    .map(([seller_id, stats]) => ({ seller_id, ...stats }))
    .sort((a, b) => b.profit - a.profit);

  const totalSellers = sortedSellers.length;
  sortedSellers.forEach((seller, index) => {
    seller.bonus = calculateBonusByProfit(index, totalSellers, seller);
  });

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
