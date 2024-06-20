
import { providers } from 'near-api-js'
import fs from 'fs'

export const crawlData = async () => {
    const provider = new providers.JsonRpcProvider({ url: "https://rpc.mainnet.near.org" });
    const accountList = await provider.query({
        request_type: "call_function",
        account_id: "registry.potlock.near",
        method_name: "get_projects",
        args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
        finality: "optimistic",
    })
    const projectObject = (JSON.parse(Buffer.from(accountList.result).toString()));
    const data = await Object.values(projectObject).map(async (project, index) => {
        if (project.status === "Approved") {
            const projectDetail = await provider.query({
                request_type: "call_function",
                account_id: "social.near",
                method_name: "get",
                args_base64: (Buffer.from(JSON.stringify({ "keys": [`${project.id}/profile/**`] }))).toString("base64"),
                finality: "optimistic",
            })
            const dataProjectJson = (JSON.parse(Buffer.from(projectDetail.result).toString()));
            const data = Object.keys(dataProjectJson).map((key) => {
                const data = Object.values(dataProjectJson).map((item) => {
                    const data = {
                        index: index,
                        accountId: project.id == key && key,
                        projectId: project.id == key && key,
                        category: item.profile.category?.text ? [item.profile.category.text] : item.profile.category ? [item.profile.category] : JSON.parse(item.profile.plCategories),
                        backgroundImage: item.profile?.backgroundImage ? `https://ipfs.near.social/ipfs/${item.profile.backgroundImage.ipfs_cid}` : '',
                        image: item.profile?.image ? `https://ipfs.near.social/ipfs/${item.profile.image.ipfs_cid}` : '',
                        name: item.profile?.name,
                        description: item.profile?.description,
                        tagline: item.profile?.tagline,
                        socialUrl: item.profile?.linktree,
                        website: item.profile?.website,
                        tags: Object.keys(item.profile?.tags || [])
                    }
                    return data;
                })
                return data[0];
            })
            return data[0];
        }
        // projectList.push(data)
    });
    const projects = await Promise.all(data);
    //project
    // 0::magicbuild.near::MagicBuild::Public Good
    // 1::proofofvibes.near::Proof of Vibes::Social Impact
    // 2::herdao.near::H.E.R. DAO::Social Impact

    const dataWrite = projects.filter(value => { return !!value }).map(obj => `${obj.accountId}::${obj.name}::${obj.category.join('|')}`).join('\n');


    // const SnapshotFilename = './data/project.dat';
    // fs.writeFileSync(SnapshotFilename, dataWrite);

    //user
    // 1::F::1::10::48067
    // 2::M::56::16::70072
    // 3::M::25::15::55117

    // const res = await fetch('https://dev.potlock.io/api/v1/donors?format=json&limit=9999&offset=0');
    // const dataDonnor = await res.json();
    // const dataWritedonnor = dataDonnor.results.filter(value => { return !!value }).map((obj,index) => `${obj.id}::${obj.total_donations_out_usd}`).join('\n');
    // const SnapshotFilenameDonors = './data/donors.dat';
    // fs.writeFileSync(SnapshotFilenameDonors, dataWritedonnor);

    //donnor
    // 1::1193::5::978300760
    // 1::661::3::978302109
    // 1::914::3::978301968
    const projectlist = await projects.filter(value => { return !!value }).map(obj => obj.accountId);
    const projectlistData = await projectlist.map(async (project) => {
        const res = await fetch(`https://dev.potlock.io/api/v1/accounts/${project}/donations_received?format=json&limit=9999&offset=0`);
        if (res.ok) {
            const data = await res.json();
            return data.results;
        }

    })
    const projectdononors = await Promise.all(projectlistData);
    const FlatArray = [].concat(...projectdononors);
   // console.log(FlatArray[0])
    const totalAmountMap = {};

    FlatArray.forEach(item => {
        if (item?.donor) {
            const key = `${item.donor}|${item.recipient}`;
            const amount = parseInt(item.total_amount)/1e24;
            totalAmountMap[key] = (totalAmountMap[key] || 0) + amount;
        }

    });

    const resultArray = Object.entries(totalAmountMap).map(([key, total_amount]) => {
        const [donor, recipient] = key.split('|');
        return { donor, recipient, total_amount };
    });

    console.log(totalAmountMap);
    const dataWriteRate = resultArray.filter(value => { return !!value }).map((obj,index) => `${obj.donor}::${obj.recipient}::${obj.total_amount}`).join('\n');
    const SnapshotFilenameRate = './data/rate.dat';
    fs.writeFileSync(SnapshotFilenameRate, dataWriteRate);


}
crawlData();