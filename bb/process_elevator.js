const axios = require('axios');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
import API_KEY_ENV from './env';

// ==================== 配置区域 ====================
// 请替换为你的高德地图API密钥
const API_KEY = API_KEY_ENV;  // <-- 在这里填入你的密钥

// 各区域的CBD中心点（可根据实际情况调整）
const REGION_CBD = {
    '宝安区': { name: '宝安中心区', coord: '22.555025, 113.884312' },
    '福田区': { name: '福田CBD', coord: '22.543096, 114.054156' },
    '罗湖区': { name: '罗湖中心', coord: '22.542883, 114.128632' },
    '南山区': { name: '南山中心区', coord: '22.522878, 113.938516' }
};

// ==================== 工具函数 ====================

/**
 * 计算两个经纬度之间的距离（使用Haversine公式）
 * @param {string} coord1 - 格式: "纬度, 经度"
 * @param {string} coord2 - 格式: "纬度, 经度"
 * @returns {number} 距离（公里）
 */
function calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return null;
    
    try {
        // 解析坐标
        const [lat1, lon1] = coord1.split(',').map(Number);
        const [lat2, lon2] = coord2.split(',').map(Number);
        
        const R = 6371; // 地球半径（公里）
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return Math.round(distance * 100) / 100; // 保留两位小数
    } catch (error) {
        console.error('距离计算错误:', error.message);
        return null;
    }
}

/**
 * 角度转弧度
 */
function deg2rad(deg) {
    return deg * (Math.PI/180);
}

/**
 * 使用高德地图API获取地址的经纬度
 * @param {string} address - 完整地址
 * @returns {Promise<string|null>} 经纬度字符串 "纬度, 经度"
 */
async function getLocationAmap(address) {
    const url = 'https://restapi.amap.com/v3/geocode/geo';
    
    try {
        const response = await axios.get(url, {
            params: {
                address: address,
                output: 'JSON',
                key: API_KEY,
                city: '深圳'
            },
            timeout: 5000
        });
        
        const data = response.data;
        
        if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
            const location = data.geocodes[0].location;
            const [lng, lat] = location.split(',');
            return `${lat}, ${lng}`;
        } else {
            console.log(`❌ 地址获取失败: ${address} - ${data.info || '未知错误'}`);
            return null;
        }
    } catch (error) {
        console.log(`⚠️ 请求异常: ${address} - ${error.message}`);
        return null;
    }
}

/**
 * 延迟函数，避免请求过快
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 主程序 ====================

async function main() {
    console.log('='.repeat(50));
    console.log('开始处理电梯点位数据');
    console.log('='.repeat(50));
    
    // 1. 检查API密钥
    if (API_KEY === 'bc514e21e1fb6ac8bea264743557789d') {
        console.log('⚠️  请先在高德地图官网申请API密钥，并填入代码中的 API_KEY 变量');
        console.log('   申请地址: https://lbs.amap.com/');
        return;
    }
    
    // 2. 读取Excel文件
    const inputFile = '电梯点位2.xlsx';
    if (!fs.existsSync(inputFile)) {
        console.log(`错误: 找不到文件 ${inputFile}`);
        console.log('请确保文件在当前目录下，并命名为 "电梯点位2.xlsx"');
        return;
    }
    
    console.log(`📖 读取文件: ${inputFile}`);
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data[0];
    const rows = data.slice(1);
    
    console.log(`总共有 ${rows.length} 条记录`);
    
    // 3. 创建新的数据结构
    const newHeaders = [
        headers[0],                    // 区域
        '区域CBD经纬度',                // 新增列
        headers[1],                    // 项目地址
        '项目地址经纬度',                // 新增列
        '与CBD之间距离(km)'              // 新增列
    ];
    
    const newRows = [];
    
    // 4. 处理每一行数据
    console.log('\n🌐 开始获取项目地址经纬度（这可能需要几分钟时间）...');
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;
        
        const region = row[0];
        const address = row[1];
        
        if (!region || !address) continue;
        
        console.log(`进度: [${i+1}/${rows.length}] 正在处理: ${address.substring(0, 20)}...`);
        
        // 获取区域CBD经纬度
        const cbdCoord = REGION_CBD[region]?.coord || null;
        
        // 获取项目地址经纬度
        const fullAddress = `深圳市${region}${address}`;
        const projectCoord = await getLocationAmap(fullAddress);
        
        // 计算距离
        const distance = calculateDistance(cbdCoord, projectCoord);
        
        // 创建新行
        const newRow = [
            region,
            cbdCoord,
            address,
            projectCoord,
            distance
        ];
        
        newRows.push(newRow);
        
        if (projectCoord) {
            console.log(`  ✅ ${projectCoord} 距离: ${distance}km`);
        } else {
            console.log('  ❌ 获取失败');
        }
        
        // 暂停一下，避免请求过快
        await sleep(300);
    }
    
    // 5. 创建新的工作表并保存
    const newWorksheet = XLSX.utils.aoa_to_sheet([newHeaders, ...newRows]);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
    
    const outputFile = '电梯点位_处理结果.xlsx';
    XLSX.writeFile(newWorkbook, outputFile);
    
    console.log(`\n✅ 处理完成！`);
    console.log(`📁 结果已保存到: ${outputFile}`);
    
    // 6. 统计信息
    const successCount = newRows.filter(row => row[3]).length;
    console.log(`\n📊 统计信息:`);
    console.log(`- 总记录数: ${rows.length}`);
    console.log(`- 成功获取经纬度: ${successCount}`);
    console.log(`- 失败: ${rows.length - successCount}`);
    
    // 7. 各区域统计
    console.log(`\n📍 各区域数量:`);
    const regionStats = {};
    newRows.forEach(row => {
        const region = row[0];
        if (!regionStats[region]) {
            regionStats[region] = { total: 0, success: 0 };
        }
        regionStats[region].total++;
        if (row[3]) regionStats[region].success++;
    });
    
    Object.entries(regionStats).forEach(([region, stats]) => {
        console.log(`  ${region}: ${stats.total}条 (成功: ${stats.success})`);
    });
}

// ==================== 简化版：使用本地计算 ====================

/**
 * 如果你不想使用API，可以使用这个简化版本
 * 只添加CBD经纬度和计算距离（不获取项目地址经纬度）
 */
function createSimpleVersion() {
    console.log('\n📝 创建简化版本（使用模拟经纬度）...');
    
    const inputFile = '电梯点位2.xlsx';
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data[0];
    const rows = data.slice(1);
    
    // 模拟一些项目地址的经纬度（实际使用时需要真实数据）
    const mockCoords = {
        '宝安区': [
            [22.562, 113.912],  // 新安
            [22.728, 113.788],  // 沙井
            // ... 这里需要补充更多
        ]
    };
    
    const newHeaders = [
        headers[0],
        '区域CBD经纬度',
        headers[1],
        '项目地址经纬度',
        '与CBD之间距离(km)'
    ];
    
    const newRows = rows.map((row, index) => {
        const region = row[0];
        const address = row[1];
        const cbdCoord = REGION_CBD[region]?.coord;
        
        // 模拟项目地址经纬度（实际应用中应该用真实数据）
        const mockLat = 22.5 + Math.random() * 0.3;
        const mockLng = 113.8 + Math.random() * 0.4;
        const projectCoord = `${mockLat.toFixed(6)}, ${mockLng.toFixed(6)}`;
        
        const distance = calculateDistance(cbdCoord, projectCoord);
        
        return [region, cbdCoord, address, projectCoord, distance];
    });
    
    const newWorksheet = XLSX.utils.aoa_to_sheet([newHeaders, ...newRows]);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
    XLSX.writeFile(newWorkbook, '电梯点位_简化版.xlsx');
    
    console.log('简化版已保存为: 电梯点位_简化版.xlsx');
}

// 运行主程序
main().catch(console.error);

// 如果你只想测试简化版，取消下面的注释
// createSimpleVersion();