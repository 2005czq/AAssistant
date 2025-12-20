#include<bits/stdc++.h>
#include<windows.h>
#define maxint 2147483647
using namespace std;
int num,blen;
struct human{
	string name;
	int pay;
}a[1005];
struct bill{
	string reason;
	int id,pay[1005];
}b[1005];

bool cmp(human x,human y){
	return x.pay<y.pay;
}

void getinfo(){
	string line,word[1005];
	ifstream I("info.txt");
	I>>num;
	for(int i=1;i<=num;i++)I>>a[i].name;
	getline(I,line);
	while(getline(I,line)){
		blen++;
		istringstream iss(line);
		int len=0;
		while(iss>>word[len])len++;
		int payid=stoi(word[0]);
		b[blen].id=payid;
		b[blen].reason=word[1];
		
		if(len==3){
			int average=ceil(stod(word[2])*100/num);
			for(int i=1;i<=num;i++){
				if(payid==i)continue;
				b[blen].pay[i]=average;
				a[i].pay-=average;
				a[payid].pay+=average;
			}
			continue;
		}
		if(word[2][0]=='-'){
			int average=ceil(-stod(word[2])*100/(num-len+3));
			for(int i=1;i<=num;i++){
				if(payid==i)continue;
				b[blen].pay[i]=average;
				a[i].pay-=average;
				a[payid].pay+=average;
			}
			for(int i=3;i<len;i++){
				int removeid=stoi(word[i]);
				b[blen].pay[removeid]=0;
				a[removeid].pay+=average;
				a[payid].pay-=average;
			}
			continue;
		}
		if(word[2][0]=='+'){
			int average=ceil(stod(word[2])*100/(len-3));
			for(int i=3;i<len;i++){
				int joinid=stoi(word[i]);
				b[blen].pay[joinid]=average;
				a[joinid].pay-=average;
				a[payid].pay+=average;
			}
			continue;
		}
		for(int i=1;i<=num;i++){
			if(payid==i)continue;
			int debt=ceil(stod(word[1+i])*100);
			b[blen].pay[i]=debt;
			a[i].pay-=debt;
			a[payid].pay+=debt;
		}
	}
	I.close();
	return;
}

void showpay(){
	ofstream O("bill.txt");
	O<<fixed<<setprecision(2);
	O<<"****************Bill****************\n\n";
	for(int i=1;i<=blen;i++){
		O<<a[b[i].id].name<<" pays for "<<b[i].reason<<",\n";
		for(int j=1;j<=num;j++){
			if(b[i].id==j||b[i].pay[j]==0)continue;
			O<<"\t"<<a[j].name<<" should pay "<<1.0*b[i].pay[j]/100<<"\n";
		}
	}
	O<<"\n***************Result***************\n\n";
	for(int i=1;i<=num;i++)if(a[i].pay==0)a[i].pay=maxint;
	sort(a+1,a+num+1,cmp);
	int sum=0;
	for(int i=1;i<num;i++){
		sum-=a[i].pay;
		if(a[i+1].pay==maxint)return;
		O<<a[i].name<<" should transfer "<<1.0*sum/100<<" to "<<a[i+1].name<<endl;
	}
	O<<"\n************************************";
	O.close();
	system("start bill.txt");
	return;
}

int main(){
	getinfo();
	showpay();
}

