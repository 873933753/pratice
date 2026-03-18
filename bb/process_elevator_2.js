const axios = require('axios');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
import API_KEY_ENV from './env';

// ==================== 配置区域 ====================
// 请替换为你的高德地图API密钥（必须是Web服务类型）
const API_KEY = API_KEY_ENV;  // <-- 在这里填入你的密钥


// 各区域的CBD中心点（根据深圳各行政区中心调整）
const REGION_CBD = {
    '福田区': { name: '福田CBD', coord: '22.543096, 114.054156' },
    '南山区': { name: '南山中心区', coord: '22.522878, 113.938516' },
    '罗湖区': { name: '罗湖中心', coord: '22.542883, 114.128632' },
    '宝安区': { name: '宝安中心区', coord: '22.555025, 113.884312' },
    '龙岗区': { name: '龙岗中心城', coord: '22.720973, 114.246899' },
    '龙华区': { name: '龙华中心区', coord: '22.656408, 114.019351' },
    '光明区': { name: '光明中心区', coord: '22.748667, 113.935628' },
    '坪山区': { name: '坪山中心区', coord: '22.708847, 114.336219' },
    '盐田区': { name: '盐田中心区', coord: '22.555892, 114.237741' }
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
            timeout: 8000
        });
        
        const data = response.data;
        
        if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
            const location = data.geocodes[0].location;
            const [lng, lat] = location.split(',');
            return `${lat}, ${lng}`;
        } else {
            // 根据错误码给出提示
            const errorMap = {
                '10001': '密钥无效',
                '10002': '服务不存在',
                '10003': '服务已关闭',
                '10004': '参数错误',
                '10005': '请求超限',
                '20000': '日调用量超限'
            };
            
            if (data.infocode && errorMap[data.infocode]) {
                console.log(`  ❌ API错误: ${errorMap[data.infocode]}`);
            } else {
                console.log(`  ❌ 地址解析失败: ${data.info || '未知错误'}`);
            }
            return null;
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.log('  ⏱️ 请求超时');
        } else if (error.response) {
            console.log(`  ❌ HTTP错误: ${error.response.status}`);
        } else {
            console.log(`  ❌ 请求失败: ${error.message}`);
        }
        return null;
    }
}

/**
 * 延迟函数，避免请求过快
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试API密钥是否有效
 */
async function testApiKey() {
    console.log('🔑 正在测试API密钥...');
    const testAddress = '深圳市福田区市民中心';
    const result = await getLocationAmap(testAddress);
    
    if (result) {
        console.log('✅ API密钥有效，可以正常使用');
        return true;
    } else {
        console.log('❌ API密钥无效，请检查：');
        console.log('   1. 是否正确创建了"Web服务"类型的密钥');
        console.log('   2. 密钥是否已启用');
        console.log('   3. 是否超出了调用限制');
        return false;
    }
}

// ==================== 主程序 ====================

async function main() {
    console.log('='.repeat(60));
    console.log('深圳电梯点位地址解析工具');
    console.log('='.repeat(60));
    
    // 1. 检查API密钥
    if (!API_KEY || API_KEY === '你的高德地图API密钥') {
        console.log('❌ 请先在代码中填入正确的API密钥');
        console.log('\n获取步骤:');
        console.log('1. 访问 https://lbs.amap.com/');
        console.log('2. 注册/登录后进入「应用管理」');
        console.log('3. 创建新应用，平台类型选择「Web服务」');
        console.log('4. 获取密钥并填入代码中的 API_KEY 变量');
        return;
    }
    
    // 2. 测试API密钥
    const isValid = await testApiKey();
    if (!isValid) {
        return;
    }
    
    // 3. 读取Excel文件
    const inputFile = '补充点位.xlsx';
    if (!fs.existsSync(inputFile)) {
        console.log(`❌ 找不到文件: ${inputFile}`);
        console.log('请确保文件在当前目录下，并命名为 "补充点位.xlsx"');
        return;
    }
    
    console.log(`\n📖 读取文件: ${inputFile}`);
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON，header: 1 表示返回二维数组
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data[0];
    const rows = data.slice(1);
    
    console.log(`总共有 ${rows.length} 条记录`);
    
    // 显示各区域统计
    const regionCount = {};
    rows.forEach(row => {
        const region = row[0];
        if (region) {
            regionCount[region] = (regionCount[region] || 0) + 1;
        }
    });
    
    console.log('\n📊 各区域数量:');
    Object.entries(regionCount).forEach(([region, count]) => {
        console.log(`  ${region}: ${count}条`);
    });
    
    // 4. 询问用户处理方式
    console.log('\n⚠️  注意: 共有 ' + rows.length + ' 条记录需要处理');
    console.log('   免费版API每天有调用限制，建议分批处理');
    console.log('\n请选择处理方式:');
    console.log('1. 处理全部数据（可能耗时较长）');
    console.log('2. 只处理前100条测试');
    console.log('3. 只添加CBD经纬度，不获取项目地址经纬度（快速）');
    
    // 由于是控制台程序，我们直接让用户修改代码中的变量
    // 这里默认先处理前10条测试
    const TEST_MODE = false;  // 设为false处理全部
    const MAX_RECORDS = TEST_MODE ? 10 : rows.length;
    
    console.log(`\n🔄 当前模式: ${TEST_MODE ? '测试模式 (处理前10条)' : '完整模式 (处理全部)'}`);
    console.log('如需更改，请修改代码中的 TEST_MODE 变量');
    
    // 5. 创建新的数据结构
    const newHeaders = [
        headers[0],                    // 行政区
        headers[1],                    // 楼盘地址
        headers[2],                    // 区域CBD经纬度（如果已存在）
        '项目地址经纬度',                // 新增列
        '与CBD之间距离(km)'              // 新增列
    ];
    
    const newRows = [];
    let successCount = 0;
    let failCount = 0;
    
    // 6. 处理数据
    console.log('\n🌐 开始获取项目地址经纬度...\n');
    
    for (let i = 0; i < Math.min(rows.length, MAX_RECORDS); i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;
        
        const region = row[0];
        const address = row[1];
        
        if (!region || !address) {
            console.log(`[${i+1}/${MAX_RECORDS}] ⚠️  跳过空行`);
            continue;
        }
        
        // 获取区域CBD经纬度
        const cbdCoord = REGION_CBD[region]?.coord || '';
        if (!cbdCoord) {
            console.log(`[${i+1}/${MAX_RECORDS}] ⚠️  未知区域: ${region}`);
        }
        
        // 构建完整地址
        const fullAddress = `深圳市${region}${address}`;
        console.log(`[${i+1}/${MAX_RECORDS}] 处理: ${fullAddress.substring(0, 40)}...`);
        
        // 获取项目地址经纬度
        const projectCoord = await getLocationAmap(fullAddress);
        
        if (projectCoord) {
            successCount++;
        } else {
            failCount++;
        }
        
        // 计算距离
        const distance = calculateDistance(cbdCoord, projectCoord);
        
        // 添加到结果数组
        newRows.push([
            region,
            address,
            cbdCoord,
            projectCoord,
            distance
        ]);
        
        if (projectCoord) {
            console.log(`  ✅ 成功: ${projectCoord} 距离: ${distance}km`);
        } else {
            console.log(`  ❌ 失败`);
        }
        
        // 暂停一下，避免请求过快
        await sleep(500);
    }
    
    // 7. 保存结果
    console.log(`\n📊 处理完成！`);
    console.log(`   成功: ${successCount}, 失败: ${failCount}`);
    
    const outputFile = TEST_MODE ? '补充点位_测试结果.xlsx' : '补充点位_完整结果.xlsx';
    
    const newWorksheet = XLSX.utils.aoa_to_sheet([newHeaders, ...newRows]);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
    XLSX.writeFile(newWorkbook, outputFile);
    
    console.log(`📁 结果已保存到: ${outputFile}`);
    
    // 8. 如果是测试模式，提示完整处理
    if (TEST_MODE) {
        console.log('\n💡 提示: 测试成功后，可以修改代码处理全部数据');
        console.log('   将 TEST_MODE 设为 false 即可处理全部 ' + rows.length + ' 条记录');
    }
}

// ==================== 简化版：只添加CBD经纬度 ====================

/**
 * 快速处理版本 - 不调用API，只添加CBD经纬度
 */
function quickProcess() {
    console.log('\n📝 快速处理模式（不获取项目地址经纬度）...');
    
    const inputFile = '补充点位.xlsx';
    if (!fs.existsSync(inputFile)) {
        console.log(`❌ 找不到文件: ${inputFile}`);
        return;
    }
    
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data[0];
    const rows = data.slice(1);
    
    const newHeaders = [
        headers[0],
        headers[1],
        headers[2],
        '项目地址经纬度',
        '与CBD之间距离(km)'
    ];
    
    const newRows = rows.map((row, index) => {
        const region = row[0];
        const address = row[1];
        const cbdCoord = REGION_CBD[region]?.coord || row[2];
        
        return [
            region,
            address,
            cbdCoord,
            '',  // 项目地址经纬度留空
            ''   // 距离留空
        ];
    });
    
    const newWorksheet = XLSX.utils.aoa_to_sheet([newHeaders, ...newRows]);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
    
    const outputFile = '补充点位_基础版.xlsx';
    XLSX.writeFile(newWorkbook, outputFile);
    
    console.log(`✅ 快速处理完成！`);
    console.log(`📁 结果已保存到: ${outputFile}`);
    console.log(`   - 已添加区域CBD经纬度`);
    console.log(`   - 项目地址经纬度需要手动填写或通过API获取`);
}

// ==================== 运行程序 ====================

// 主程序入口
(async () => {
    // 取消注释下面的行来运行快速处理
    // quickProcess();
    // return;
    
    await main();
})();

// 导出函数供其他模块使用
module.exports = {
    getLocationAmap,
    calculateDistance,
    REGION_CBD
};